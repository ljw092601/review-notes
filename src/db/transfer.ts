import { ZodError } from 'zod'
import { db, newId } from './db'
import { blobToDataUrl, dataUrlToBlob } from '@/models/dataUrl'
import { FALLBACK_CATEGORY_ID } from '@/models/categories'
import { importFileSchema, type ImportFile, type ImportProblem } from '@/models/schemas'
import type { Problem } from '@/models/types'

export interface ImportPreview {
  file: ImportFile
  /** 가져올 문제와 중복 여부 */
  items: Array<{ problem: ImportProblem; duplicateOf?: Problem }>
  /** DB에 없는 유형 id. 가져올 때 '기타'로 바뀐다 */
  unknownCategories: string[]
  /** base64 없이 파일 경로만 있는 사진 수. 자동 백업 파일을 직접 드롭했을 때 생기며, 이 사진들은 가져오지 않는다 */
  missingImages: number
}

export interface ImportResult {
  added: number
  skipped: number
  /** 덮어쓰기로 갱신한 기존 문제 수 */
  updated: number
  attemptsAdded: number
}

/**
 * 이미 있는 문제를 만났을 때.
 * skip = 건너뛰기, add = 따로 하나 더 추가, overwrite = 기존 문제를 파일 내용으로 갱신(틀린 이유·복습 기록·등록일은 유지)
 */
export type DuplicateMode = 'skip' | 'add' | 'overwrite'

export class ImportFormatError extends Error {
  issues: string[]
  constructor(issues: string[]) {
    super(`가져오기 파일 형식이 잘못되었습니다:\n${issues.join('\n')}`)
    this.name = 'ImportFormatError'
    this.issues = issues
  }
}

export function parseImportFile(json: unknown): ImportFile {
  try {
    return importFileSchema.parse(json)
  } catch (e) {
    if (e instanceof ZodError) {
      throw new ImportFormatError(e.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`))
    }
    throw e
  }
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** 같은 출처(비어 있지 않을 때) 또는 같은 문제 본문이면 중복으로 본다 */
export async function previewImport(json: unknown): Promise<ImportPreview> {
  const file = parseImportFile(json)
  const existing = await db.problems.toArray()
  const bySource = new Map<string, Problem>()
  for (const p of existing) if (p.source?.trim()) bySource.set(normalize(p.source), p)
  const byQuestion = new Map(existing.map((p) => [normalize(p.question), p]))
  const categoryIds = new Set((await db.categories.toArray()).map((c) => c.id))
  const incomingCategoryIds = new Set((file.categories ?? []).map((c) => c.id))

  const items = file.problems.map((problem) => {
    const duplicateOf =
      (problem.source?.trim() ? bySource.get(normalize(problem.source)) : undefined) ??
      byQuestion.get(normalize(problem.question))
    return { problem, duplicateOf }
  })
  const unknownCategories = [
    ...new Set(
      file.problems.map((p) => p.category).filter((c) => !categoryIds.has(c) && !incomingCategoryIds.has(c)),
    ),
  ]
  const missingImages = file.problems.reduce((n, p) => n + p.images.filter((img) => !('dataUrl' in img)).length, 0)
  return { file, items, unknownCategories, missingImages }
}

export async function importProblems(
  preview: ImportPreview,
  options: { duplicates?: DuplicateMode; skipDuplicates?: boolean } = {},
): Promise<ImportResult> {
  const mode: DuplicateMode = options.duplicates ?? (options.skipDuplicates === false ? 'add' : 'skip')
  const result: ImportResult = { added: 0, skipped: 0, updated: 0, attemptsAdded: 0 }
  const idMap = new Map<string, string>()

  await db.transaction('rw', db.problems, db.images, db.attempts, db.categories, async () => {
    for (const category of preview.file.categories ?? []) {
      if (!(await db.categories.get(category.id))) await db.categories.add(category)
    }
    const categoryIds = new Set((await db.categories.toArray()).map((c) => c.id))

    for (const { problem, duplicateOf } of preview.items) {
      if (duplicateOf && mode === 'skip') {
        result.skipped++
        continue
      }
      if (duplicateOf && mode === 'overwrite') {
        await overwriteProblem(duplicateOf, problem, categoryIds)
        if (problem.id) idMap.set(problem.id, duplicateOf.id)
        result.updated++
        continue
      }
      const { images, id: givenId, createdAt, updatedAt, ...input } = problem
      const id = givenId && !(await db.problems.get(givenId)) ? givenId : newId()
      if (givenId) idMap.set(givenId, id)
      const now = Date.now()
      await db.problems.add({
        ...input,
        category: categoryIds.has(input.category) ? input.category : FALLBACK_CATEGORY_ID,
        id,
        createdAt: createdAt ?? now,
        updatedAt: updatedAt ?? now,
      })
      for (const image of images) {
        if (!('dataUrl' in image)) continue
        await db.images.add({
          id: newId(),
          problemId: id,
          blob: dataUrlToBlob(image.dataUrl),
          name: image.name,
          createdAt: now,
        })
      }
      result.added++
    }

    for (const attempt of preview.file.attempts ?? []) {
      const problemId = idMap.get(attempt.problemId)
      if (!problemId) continue
      await db.attempts.add({
        id: newId(),
        problemId,
        answer: attempt.answer,
        result: attempt.result,
        memo: attempt.memo,
        attemptedAt: attempt.attemptedAt,
      })
      result.attemptsAdded++
    }
  })
  return result
}

/**
 * 기존 문제를 파일의 문제로 덮어쓴다. 문제·정답·풀이·유형·태그·사진은 파일 쪽으로 바꾸고,
 * 사용자가 앱에서 적은 것(틀린 이유, 내 답)은 파일에 값이 없으면 남긴다. id·등록일·복습 기록은 그대로.
 */
async function overwriteProblem(existing: Problem, incoming: ImportProblem, categoryIds: Set<string>): Promise<void> {
  const now = Date.now()
  const explanation = incoming.explanation.trim() ? incoming.explanation : existing.explanation
  const wrongReason = incoming.wrongReason.trim() ? incoming.wrongReason : existing.wrongReason
  const updated: Problem = {
    ...existing,
    certification: incoming.certification,
    category: categoryIds.has(incoming.category) ? incoming.category : FALLBACK_CATEGORY_ID,
    source: incoming.source,
    answerType: incoming.answerType,
    question: incoming.question,
    choices: incoming.answerType === 'choice' ? incoming.choices : undefined,
    myAnswer: incoming.myAnswer.trim() ? incoming.myAnswer : existing.myAnswer,
    correctAnswer: incoming.correctAnswer,
    answerConfidence: incoming.answerConfidence,
    explanation,
    wrongReason,
    status: explanation.trim() && wrongReason.trim() ? 'done' : 'draft',
    tags: incoming.tags,
    updatedAt: now,
  }
  await db.problems.put(updated)

  const images = incoming.images.filter((img) => 'dataUrl' in img)
  if (images.length === 0) return
  await db.images.where('problemId').equals(existing.id).delete()
  for (const image of images) {
    await db.images.add({ id: newId(), problemId: existing.id, blob: dataUrlToBlob(image.dataUrl), name: image.name, createdAt: now })
  }
}

/** 전체 백업. 이미지는 base64로 포함한다. */
export async function exportAll(): Promise<ImportFile> {
  const [problems, images, attempts, categories] = await Promise.all([
    db.problems.orderBy('createdAt').toArray(),
    db.images.toArray(),
    db.attempts.orderBy('attemptedAt').toArray(),
    db.categories.orderBy('order').toArray(),
  ])
  const imagesByProblem = new Map<string, typeof images>()
  for (const image of images) {
    const list = imagesByProblem.get(image.problemId) ?? []
    list.push(image)
    imagesByProblem.set(image.problemId, list)
  }
  return {
    version: 1,
    exportedAt: Date.now(),
    categories,
    problems: await Promise.all(
      problems.map(async (p) => ({
        ...p,
        images: await Promise.all(
          (imagesByProblem.get(p.id) ?? []).map(async (img) => ({
            name: img.name,
            dataUrl: await blobToDataUrl(img.blob),
          })),
        ),
      })),
    ),
    attempts,
  }
}
