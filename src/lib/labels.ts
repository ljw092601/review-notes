import type { AnswerType, AttemptResult } from '@/models/types'

export const ANSWER_TYPE_LABEL: Record<AnswerType, string> = {
  short: '단답형',
  essay: '서술형',
  choice: '객관식',
}

export const RESULT_LABEL: Record<AttemptResult, string> = {
  correct: '맞음',
  partial: '부분',
  wrong: '틀림',
}
