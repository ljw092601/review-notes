import { db, newId } from './db'
import { problemInputSchema } from '@/models/schemas'
import type { Attempt, AttemptResult, ImageRecord, Problem, ProblemInput } from '@/models/types'

export type ProblemSort = 'createdDesc' | 'updatedDesc' | 'reviewedDesc' | 'wrongCountDesc'

export interface ProblemFilter {
  category?: string
  status?: Problem['status']
  tags?: string[]
  /** 문제·정답·풀이·틀린 이유·출처 전문 검색 */
  search?: string
  /** 최근 복습 결과. 'none'은 아직 안 풀어본 문제 */
  result?: AttemptResult | 'none'
  sort?: ProblemSort
}

export async function createProblem(input: ProblemInput, id = newId()): Promise<Problem> {
  const now = Date.now()
  const problem: Problem = { ...problemInputSchema.parse(input), id, createdAt: now, updatedAt: now }
  await db.problems.add(problem)
  return problem
}

export async function updateProblem(id: string, patch: Partial<ProblemInput>): Promise<Problem> {
  const existing = await db.problems.get(id)
  if (!existing) throw new Error(`문제를 찾을 수 없습니다: ${id}`)
  const merged = problemInputSchema.parse({ ...existing, ...patch })
  const updated: Problem = { ...existing, ...merged, updatedAt: Date.now() }
  await db.problems.put(updated)
  return updated
}

export function getProblem(id: string): Promise<Problem | undefined> {
  return db.problems.get(id)
}

/** 문제와 딸린 이미지·시도 기록을 함께 삭제한다. */
export async function deleteProblem(id: string): Promise<void> {
  await db.transaction('rw', db.problems, db.images, db.attempts, async () => {
    await db.images.where('problemId').equals(id).delete()
    await db.attempts.where('problemId').equals(id).delete()
    await db.problems.delete(id)
  })
}

export interface ProblemSnapshot {
  problem: Problem
  images: ImageRecord[]
  attempts: Attempt[]
}

/** 삭제 취소(Undo)를 위해 삭제 전 상태를 돌려준다. 문제가 없으면 undefined */
export async function deleteProblemWithSnapshot(id: string): Promise<ProblemSnapshot | undefined> {
  return db.transaction('rw', db.problems, db.images, db.attempts, async () => {
    const problem = await db.problems.get(id)
    if (!problem) return undefined
    const [images, attempts] = await Promise.all([
      db.images.where('problemId').equals(id).toArray(),
      db.attempts.where('problemId').equals(id).toArray(),
    ])
    await db.images.where('problemId').equals(id).delete()
    await db.attempts.where('problemId').equals(id).delete()
    await db.problems.delete(id)
    return { problem, images, attempts }
  })
}

export async function restoreProblem(snapshot: ProblemSnapshot): Promise<void> {
  await db.transaction('rw', db.problems, db.images, db.attempts, async () => {
    await db.problems.put(snapshot.problem)
    await db.images.bulkPut(snapshot.images)
    await db.attempts.bulkPut(snapshot.attempts)
  })
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function queryProblems(filter: ProblemFilter = {}): Promise<Problem[]> {
  let collection =
    filter.category !== undefined
      ? db.problems.where('category').equals(filter.category)
      : filter.status !== undefined
        ? db.problems.where('status').equals(filter.status)
        : db.problems.toCollection()

  if (filter.category !== undefined && filter.status !== undefined) {
    const status = filter.status
    collection = collection.filter((p) => p.status === status)
  }
  if (filter.tags?.length) {
    const wanted = filter.tags
    collection = collection.filter((p) => wanted.every((t) => p.tags.includes(t)))
  }
  if (filter.search?.trim()) {
    const q = normalize(filter.search)
    collection = collection.filter((p) =>
      [p.question, p.correctAnswer, p.myAnswer, p.explanation, p.wrongReason, p.source ?? '', ...p.tags].some((f) =>
        normalize(f).includes(q),
      ),
    )
  }

  let problems = await collection.toArray()
  const sort = filter.sort ?? 'createdDesc'
  const needLatest = filter.result !== undefined || sort === 'reviewedDesc'
  const latest = needLatest ? await latestAttempts(problems.map((p) => p.id)) : undefined

  if (filter.result !== undefined && latest) {
    const wanted = filter.result
    problems = problems.filter((p) => {
      const last = latest.get(p.id)
      return wanted === 'none' ? !last : last?.result === wanted
    })
  }

  if (sort === 'createdDesc') problems.sort((a, b) => b.createdAt - a.createdAt)
  if (sort === 'updatedDesc') problems.sort((a, b) => b.updatedAt - a.updatedAt)
  if (sort === 'reviewedDesc' && latest) {
    const at = (p: Problem) => latest.get(p.id)?.attemptedAt ?? 0
    problems.sort((a, b) => at(b) - at(a) || b.createdAt - a.createdAt)
  }
  if (sort === 'wrongCountDesc') {
    const counts = await wrongAttemptCounts(problems.map((p) => p.id))
    problems.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || b.createdAt - a.createdAt)
  }
  return problems
}

/** 문제별 가장 최근 시도 하나씩 */
export async function latestAttempts(problemIds: string[]): Promise<Map<string, Attempt>> {
  const latest = new Map<string, Attempt>()
  if (problemIds.length === 0) return latest
  const attempts = await db.attempts.where('problemId').anyOf(problemIds).toArray()
  for (const a of attempts) {
    const prev = latest.get(a.problemId)
    if (!prev || a.attemptedAt > prev.attemptedAt) latest.set(a.problemId, a)
  }
  return latest
}

async function wrongAttemptCounts(problemIds: string[]): Promise<Map<string, number>> {
  const attempts = await db.attempts.where('problemId').anyOf(problemIds).toArray()
  const counts = new Map<string, number>()
  for (const a of attempts) {
    if (a.result === 'wrong') counts.set(a.problemId, (counts.get(a.problemId) ?? 0) + 1)
  }
  return counts
}

/** 모든 문제에 쓰인 태그와 사용 횟수 */
export async function listTags(): Promise<Array<{ tag: string; count: number }>> {
  const counts = new Map<string, number>()
  await db.problems.each((p) => {
    for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  })
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

// ---- 이미지 ----

export async function addImage(problemId: string, blob: Blob, name: string, id = newId()): Promise<ImageRecord> {
  const image: ImageRecord = { id, problemId, blob, name, createdAt: Date.now() }
  await db.images.add(image)
  return image
}

export function listImages(problemId: string): Promise<ImageRecord[]> {
  return db.images.where('problemId').equals(problemId).sortBy('createdAt')
}

export function deleteImage(id: string): Promise<void> {
  return db.images.delete(id)
}

// ---- 복습 시도 ----

export async function addAttempt(
  problemId: string,
  data: { answer: string; result: AttemptResult; memo?: string },
  id = newId(),
): Promise<Attempt> {
  const attempt: Attempt = { id, problemId, attemptedAt: Date.now(), ...data }
  await db.attempts.add(attempt)
  return attempt
}

/** 최근 시도가 앞에 온다 */
export function listAttempts(problemId: string): Promise<Attempt[]> {
  return db.attempts.where('problemId').equals(problemId).reverse().sortBy('attemptedAt')
}

export async function latestAttempt(problemId: string): Promise<Attempt | undefined> {
  const [latest] = await listAttempts(problemId)
  return latest
}
