/** 인쇄 화면 옵션. 목록 필터(?category=&tag=…)와 함께 URL 쿼리에 들어간다 */
export type PrintMode = 'notes' | 'concepts' | 'quiz'

export interface PrintOptions {
  /** notes = 문제·정답·풀이를 한 장에, concepts = 풀이(핵심 개념)만 유형별로, quiz = 문제만 두고 정답은 맨 뒤에 */
  mode: PrintMode
  /** 틀린 이유 포함 (notes) */
  reason: boolean
  /** 내 답 포함 (notes) */
  myAnswer: boolean
  /** 원본 사진 포함 (notes·quiz) */
  images: boolean
}

export const MODE_OPTIONS: Array<{ value: PrintMode; label: string; hint: string }> = [
  { value: 'notes', label: '오답노트', hint: '문제 → 정답 → 풀이(→ 틀린 이유) 순서로. 시험장에서 훑어보는 용도' },
  { value: 'concepts', label: '개념 정리', hint: '풀이 칸의 핵심 개념만 유형별로 모아서. 풀이가 비어 있는 문제는 빠져요' },
  { value: 'quiz', label: '문제만', hint: '문제만 번호를 붙여 두고 정답은 맨 뒤 장에. 직접 풀어 보는 용도' },
]

const MODE_SET = new Set(MODE_OPTIONS.map((o) => o.value))

export const DEFAULT_PRINT_OPTIONS: PrintOptions = { mode: 'notes', reason: true, myAnswer: false, images: false }

export function parsePrintOptions(params: URLSearchParams): PrintOptions {
  const mode = params.get('mode') ?? ''
  return {
    mode: MODE_SET.has(mode as PrintMode) ? (mode as PrintMode) : DEFAULT_PRINT_OPTIONS.mode,
    reason: params.get('reason') !== '0',
    myAnswer: params.get('my') === '1',
    images: params.get('images') === '1',
  }
}

/** 기본값은 생략한다. 목록 필터 파라미터와 합쳐 쓴다 */
export function applyPrintOptions(params: URLSearchParams, o: PrintOptions): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const k of ['mode', 'reason', 'my', 'images']) next.delete(k)
  if (o.mode !== DEFAULT_PRINT_OPTIONS.mode) next.set('mode', o.mode)
  if (!o.reason) next.set('reason', '0')
  if (o.myAnswer) next.set('my', '1')
  if (o.images) next.set('images', '1')
  return next
}
