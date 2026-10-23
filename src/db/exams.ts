import { useLiveQuery } from 'dexie-react-hooks'
import { db, newId } from './db'
import type { AttemptResult, ExamResult } from '@/models/types'

/** 100점 만점. 맞음 = 문항 배점, 부분 = 절반 */
export function examScore(results: Record<number, AttemptResult>, total: number): number {
  if (total <= 0) return 0
  let points = 0
  for (const r of Object.values(results)) points += r === 'correct' ? 1 : r === 'partial' ? 0.5 : 0
  return Math.round((points / total) * 100)
}

export async function saveExamResult(data: Omit<ExamResult, 'id' | 'takenAt'>, id = newId()): Promise<ExamResult> {
  const result: ExamResult = { ...data, id, takenAt: Date.now() }
  await db.examResults.add(result)
  return result
}

/** 최근 기록이 앞에 온다 */
export function listExamResults(examId?: string): Promise<ExamResult[]> {
  const collection = examId ? db.examResults.where('examId').equals(examId) : db.examResults.toCollection()
  return collection.reverse().sortBy('takenAt')
}

/** 회차별 기록 목록(최근 순). undefined면 로딩 중 */
export function useExamResults() {
  return useLiveQuery(async () => {
    const byExam = new Map<string, ExamResult[]>()
    for (const r of await listExamResults()) {
      const list = byExam.get(r.examId) ?? []
      list.push(r)
      byExam.set(r.examId, list)
    }
    return byExam
  }, [])
}

/** 출처가 같은 오답노트 문제 id. 같은 기출 문제를 두 번 넣지 않으려고 쓴다 */
export async function problemIdsBySource(sources: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  if (sources.length === 0) return found
  for (const p of await db.problems.where('source').anyOf(sources).toArray()) {
    if (p.source && !found.has(p.source)) found.set(p.source, p.id)
  }
  return found
}
