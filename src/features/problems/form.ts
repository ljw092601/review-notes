import { DEFAULT_CERTIFICATION } from '@/models/categories'
import { problemInputSchema } from '@/models/schemas'
import type { AnswerType, Problem, ProblemInput } from '@/models/types'

export interface FormValues {
  certification: string
  category: string
  source: string
  answerType: AnswerType
  question: string
  choicesText: string
  myAnswer: string
  correctAnswer: string
  explanation: string
  wrongReason: string
  tags: string[]
}

export function toFormValues(p?: Problem, defaultCategory = ''): FormValues {
  return {
    certification: p?.certification ?? DEFAULT_CERTIFICATION,
    category: p?.category ?? defaultCategory,
    source: p?.source ?? '',
    answerType: p?.answerType ?? 'short',
    question: p?.question ?? '',
    choicesText: p?.choices?.join('\n') ?? '',
    myAnswer: p?.myAnswer ?? '',
    correctAnswer: p?.correctAnswer ?? '',
    explanation: p?.explanation ?? '',
    wrongReason: p?.wrongReason ?? '',
    tags: p?.tags ?? [],
  }
}

/** 풀이와 틀린 이유를 둘 다 적으면 완료, 아니면 입력 필요 */
export function deriveStatus(v: Pick<FormValues, 'explanation' | 'wrongReason'>): Problem['status'] {
  return v.explanation.trim() && v.wrongReason.trim() ? 'done' : 'draft'
}

export function toProblemInput(v: FormValues, existing?: Problem): ProblemInput {
  const choices =
    v.answerType === 'choice'
      ? v.choicesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
  return {
    certification: v.certification,
    category: v.category,
    source: v.source.trim() || undefined,
    answerType: v.answerType,
    question: v.question,
    choices,
    myAnswer: v.myAnswer,
    correctAnswer: v.correctAnswer,
    answerConfidence: existing?.answerConfidence,
    explanation: v.explanation,
    wrongReason: v.wrongReason,
    status: deriveStatus(v),
    tags: v.tags,
  }
}

export type FieldErrors = Partial<Record<keyof FormValues, string>>

export function validate(v: FormValues): FieldErrors {
  const result = problemInputSchema.safeParse(toProblemInput(v))
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof FormValues | undefined
    if (key && !errors[key]) errors[key] = issue.message
  }
  return errors
}
