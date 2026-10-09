import type { Attempt, AttemptResult, Problem } from '@/models/types'

/** 복습 범위 */
export type QuizScope = 'all' | 'wrong' | 'unreviewed' | 'done'
export type QuizOrder = 'random' | 'stale'

export interface QuizSetup {
  category: string
  tags: string[]
  scope: QuizScope
  /** 0이면 전체 */
  limit: number
  order: QuizOrder
}

export const DEFAULT_SETUP: QuizSetup = { category: '', tags: [], scope: 'all', limit: 10, order: 'random' }

export const SCOPE_OPTIONS: Array<{ value: QuizScope; label: string; description: string }> = [
  { value: 'all', label: '전체', description: '정답이 있는 모든 문제' },
  { value: 'wrong', label: '최근에 틀린 것', description: '마지막 복습이 틀림·부분이었던 문제' },
  { value: 'unreviewed', label: '아직 안 풀어본 것', description: '복습 기록이 없는 문제' },
  { value: 'done', label: '정리 끝난 것', description: '풀이와 틀린 이유까지 적은 문제' },
]

export const LIMIT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 5, label: '5개' },
  { value: 10, label: '10개' },
  { value: 20, label: '20개' },
  { value: 0, label: '전부' },
]

export const ORDER_OPTIONS: Array<{ value: QuizOrder; label: string }> = [
  { value: 'random', label: '무작위' },
  { value: 'stale', label: '오래 안 본 순' },
]

/** 범위 조건에 맞는 문제만 남긴다. 정답이 비어 있으면 퀴즈로 낼 수 없다. */
export function filterCandidates(problems: Problem[], latest: Map<string, Attempt>, setup: Pick<QuizSetup, 'scope'>): Problem[] {
  return problems.filter((p) => {
    if (!p.correctAnswer.trim()) return false
    const last = latest.get(p.id)
    switch (setup.scope) {
      case 'wrong':
        return last !== undefined && last.result !== 'correct'
      case 'unreviewed':
        return last === undefined
      case 'done':
        return p.status === 'done'
      default:
        return true
    }
  })
}

/** 순서를 정하고 개수를 자른다. random은 주입 가능해서 테스트에서 고정할 수 있다. */
export function pickProblems(
  candidates: Problem[],
  latest: Map<string, Attempt>,
  setup: Pick<QuizSetup, 'order' | 'limit'>,
  random: () => number = Math.random,
): Problem[] {
  const list = [...candidates]
  if (setup.order === 'stale') {
    const at = (p: Problem) => latest.get(p.id)?.attemptedAt ?? 0
    list.sort((a, b) => at(a) - at(b) || a.createdAt - b.createdAt)
  } else {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[list[i], list[j]] = [list[j], list[i]]
    }
  }
  return setup.limit > 0 ? list.slice(0, setup.limit) : list
}

// ---- 세션 상태 ----

export interface QuizAnswer {
  answer: string
  result?: AttemptResult
}

export type QuizPhase = 'answer' | 'reveal' | 'summary'

export interface QuizState {
  problems: Problem[]
  index: number
  phase: QuizPhase
  answers: Record<string, QuizAnswer>
}

export type QuizAction =
  | { type: 'reveal'; answer: string }
  | { type: 'grade'; result: AttemptResult }
  | { type: 'retryWrong' }
  | { type: 'quit' }

export function initialState(problems: Problem[]): QuizState {
  return { problems, index: 0, phase: problems.length ? 'answer' : 'summary', answers: {} }
}

export function reduce(state: QuizState, action: QuizAction): QuizState {
  const current = state.problems[state.index]
  switch (action.type) {
    case 'reveal':
      if (state.phase !== 'answer' || !current) return state
      return { ...state, phase: 'reveal', answers: { ...state.answers, [current.id]: { answer: action.answer } } }
    case 'grade': {
      if (state.phase !== 'reveal' || !current) return state
      const answers = { ...state.answers, [current.id]: { ...state.answers[current.id], result: action.result } }
      const last = state.index >= state.problems.length - 1
      return { ...state, answers, index: last ? state.index : state.index + 1, phase: last ? 'summary' : 'answer' }
    }
    case 'retryWrong': {
      const wrong = state.problems.filter((p) => state.answers[p.id]?.result !== 'correct')
      return initialState(wrong)
    }
    case 'quit':
      return state.phase === 'summary' ? state : { ...state, phase: 'summary' }
    default:
      return state
  }
}

export function tally(state: QuizState): Record<AttemptResult, number> {
  const t: Record<AttemptResult, number> = { correct: 0, partial: 0, wrong: 0 }
  for (const p of state.problems) {
    const r = state.answers[p.id]?.result
    if (r) t[r]++
  }
  return t
}

/** 단답형은 공백·대소문자·괄호 안 보조 표기를 무시하고 비교해 채점을 미리 제안한다 */
export function suggestResult(problem: Problem, answer: string): AttemptResult | undefined {
  if (problem.answerType === 'essay') return undefined
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[\s.,;:'"`*_-]+/g, '')
  const mine = norm(answer)
  if (!mine) return 'wrong'
  const correct = norm(problem.correctAnswer)
  if (mine === correct) return 'correct'
  // 괄호 보조 표기 하나라도 맞으면 맞음으로 제안 (예: "제1정규형(1NF)" ↔ "1NF")
  const alternatives = [...problem.correctAnswer.matchAll(/\(([^)]*)\)/g)].map((m) => norm(m[1]))
  if (alternatives.includes(mine)) return 'correct'
  return undefined
}
