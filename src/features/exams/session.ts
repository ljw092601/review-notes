import type { AttemptResult } from '@/models/types'
import { gradeAnswer } from './answer'
import type { Exam } from './parse'

/** 실기 합격선 */
export const PASS_SCORE = 60

const DRAFT_PREFIX = 'reviewnotes.exam-draft.'

/** 풀던 답. 새로고침해도 이어 풀 수 있게 이 브라우저에만 둔다 */
export function loadDraft(examId: string): Record<number, string> {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + examId)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as Record<number, string>) : {}
  } catch {
    return {}
  }
}

export function saveDraft(examId: string, answers: Record<number, string>): void {
  try {
    if (Object.values(answers).some((a) => a.trim())) localStorage.setItem(DRAFT_PREFIX + examId, JSON.stringify(answers))
    else localStorage.removeItem(DRAFT_PREFIX + examId)
  } catch {
    // 저장소를 못 쓰는 환경이면 이어 풀기만 안 된다
  }
}

export function clearDraft(examId: string): void {
  saveDraft(examId, {})
}

/** 정답과 글자가 같거나 비워 둔 문제는 미리 채점해 둔다. 나머지는 직접 고른다 */
export function initialGrades(exam: Exam, answers: Record<number, string>): Record<number, AttemptResult> {
  const grades: Record<number, AttemptResult> = {}
  for (const q of exam.questions) {
    const { suggestion } = gradeAnswer(q.answer, answers[q.number] ?? '', q.blanks)
    if (suggestion) grades[q.number] = suggestion
  }
  return grades
}
