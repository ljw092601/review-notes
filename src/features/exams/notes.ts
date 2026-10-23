import { addAttempt, addImage, createProblem, problemIdsBySource } from '@/db'
import { FIGURE_SCHEME } from '@/lib/figures'
import { DEFAULT_CERTIFICATION, FALLBACK_CATEGORY_ID } from '@/models/categories'
import type { AttemptResult, ProblemInput } from '@/models/types'
import { examFigureNames, rewriteFigures, type Exam, type ExamQuestion } from './parse'

export const EXAM_TAG = '기출'
export const MOCK_TAG = '모의고사'

/** 오답노트의 출처 칸. 같은 기출 문제인지 이걸로 알아본다 */
export function examSource(exam: Exam, q: ExamQuestion): string {
  return `${exam.title} 정보처리기사 실기 ${q.number}번`
}

/** 기출 문제 → 오답노트 문제. 그림은 `img:이름` 참조로 바꾸고 파일은 따로 붙인다 */
export function toProblemInput(exam: Exam, q: ExamQuestion, myAnswer: string, categoryIds: ReadonlySet<string>): ProblemInput {
  const correct = q.note ? `${q.answer}\n\n> ${q.note}` : q.answer
  return {
    certification: DEFAULT_CERTIFICATION,
    category: q.category && categoryIds.has(q.category) ? q.category : FALLBACK_CATEGORY_ID,
    source: examSource(exam, q),
    answerType: 'short',
    question: rewriteFigures(q.body, (name) => `${FIGURE_SCHEME}${encodeURIComponent(name)}`),
    myAnswer,
    correctAnswer: correct,
    explanation: '',
    wrongReason: '',
    status: 'draft',
    tags: [exam.kind === 'mock' ? MOCK_TAG : EXAM_TAG, exam.id],
  }
}

export interface NoteItem {
  question: ExamQuestion
  answer: string
  result: AttemptResult
}

/**
 * 고른 문제를 오답노트에 넣고 이번 풀이를 복습 기록으로 남긴다.
 * 이미 들어 있는 문제(출처가 같음)는 새로 만들지 않고 복습 기록만 더한다.
 */
export async function addToNotes(
  exam: Exam,
  items: NoteItem[],
  opts: { categoryIds: ReadonlySet<string>; imageUrls: ReadonlyMap<string, string>; fetchBlob?: (url: string) => Promise<Blob> },
): Promise<{ created: number; updated: number }> {
  const fetchBlob = opts.fetchBlob ?? (async (url: string) => (await fetch(url)).blob())
  const existing = await problemIdsBySource(items.map((it) => examSource(exam, it.question)))
  let created = 0
  let updated = 0
  for (const it of items) {
    const known = existing.get(examSource(exam, it.question))
    if (known) {
      await addAttempt(known, { answer: it.answer, result: it.result })
      updated++
      continue
    }
    const problem = await createProblem(toProblemInput(exam, it.question, it.answer, opts.categoryIds))
    for (const name of examFigureNames(it.question.body)) {
      const url = opts.imageUrls.get(name)
      if (url) await addImage(problem.id, await fetchBlob(url), name)
    }
    await addAttempt(problem.id, { answer: it.answer, result: it.result })
    created++
  }
  return { created, updated }
}
