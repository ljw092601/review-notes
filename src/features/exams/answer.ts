/**
 * 답 입력 형태와 자동 채점. 빈칸 문제는 칸마다 따로 받지만 저장은 `① 답 ② 답` 한 줄로 한다
 * (풀이 기록·오답노트의 내 답과 같은 모양).
 */
import { suggestByText } from '@/features/quiz/session'
import type { AttemptResult } from '@/models/types'

export interface Blank {
  /** `①`, `(1)`, `(a)` */
  label: string
  answer: string
}

/** 빈칸 표시. 동그라미 숫자, (1), (a) */
const LABEL = /(?:^|\s)([①-⑳]|\((?:\d{1,2}|[a-z])\))(?=\s)/g

function labelsIn(text: string): Array<{ label: string; start: number; end: number }> {
  return [...text.matchAll(LABEL)].map((m) => {
    const start = m.index + m[0].indexOf(m[1])
    return { label: m[1], start, end: start + m[1].length }
  })
}

const kind = (label: string) => (/[①-⑳]/.test(label) ? 'circle' : /\d/.test(label) ? 'digit' : 'alpha')

/**
 * 정답이 `① A ② B`처럼 번호 붙은 칸 여러 개면 칸 목록을, 아니면 null.
 * 한 줄짜리이고 정답이 첫 번호로 시작하며 번호 종류가 같을 때만 칸으로 본다.
 */
export function parseBlanks(answer: string): Blank[] | null {
  const text = answer.trim()
  if (!text || text.includes('\n')) return null
  const found = labelsIn(` ${text} `).map((l) => ({ ...l, start: l.start - 1, end: l.end - 1 }))
  if (found.length < 2 || found[0].start !== 0) return null
  if (new Set(found.map((l) => kind(l.label))).size !== 1) return null
  if (new Set(found.map((l) => l.label)).size !== found.length) return null
  return found.map((l, i) => ({ label: l.label, answer: text.slice(l.end, found[i + 1]?.start ?? text.length).trim() }))
}

/** 칸별 값 → 저장용 한 줄 */
export function joinBlanks(labels: string[], values: string[]): string {
  if (values.every((v) => !v?.trim())) return ''
  return labels.map((label, i) => `${label} ${(values[i] ?? '').trim()}`).join(' ')
}

/** 저장된 한 줄 → 칸별 값. 번호가 없으면 첫 칸에 통째로 */
export function splitBlanks(labels: string[], text: string): string[] {
  const values = labels.map(() => '')
  const found = labelsIn(` ${text} `)
    .map((l) => ({ ...l, start: l.start - 1, end: l.end - 1 }))
    .filter((l) => labels.includes(l.label))
  if (found.length === 0) {
    if (text.trim()) values[0] = text.trim()
    return values
  }
  found.forEach((l, i) => {
    values[labels.indexOf(l.label)] = text.slice(l.end, found[i + 1]?.start ?? text.length).trim()
  })
  return values
}

/** `**보기**: a · b · c` 줄의 항목 */
export function parseChoices(body: string): string[] | undefined {
  const m = /^\*\*보기\*\*\s*:\s*(.+)$/m.exec(body)
  if (!m) return undefined
  const items = m[1]
    .split(/\s+·\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean)
  return items.length >= 2 ? items : undefined
}

/** 문제에 "3가지 골라"처럼 개수가 있으면 그 개수, "모두 골라"면 제한 없음(99) */
export function pickCount(body: string): number {
  const m = /(\d+)\s*(?:가지|개)(?:를|을)?\s*(?:골라|고르|선택|쓰)/.exec(body)
  if (m) return Number(m[1])
  return /(?:골라|고르|찾아)[^.\n]{0,8}모두|모두\s*(?:골라|고르)/.test(body) ? 99 : 1
}

/**
 * 보기 버튼을 눌렀을 때 동작.
 * single: 바꿔 넣기 / multi: 쉼표로 여러 개 / order: → 로 순서대로 / token: 코드 조각을 이어 붙이기
 */
export type ChoiceMode = 'single' | 'multi' | 'order' | 'token'

export function choiceMode(body: string, choices: string[], pick: number): ChoiceMode {
  // 코드 빈칸을 기호·글자 조각으로 짜 맞추는 문제 (예: 보기 `i · ( · n · % · )`)
  const pieces = choices.filter((c) => c.length <= 2 && !/[가-힣]/.test(c)).length
  if (pieces >= choices.length * 0.6 && /코드/.test(body)) return 'token'
  if (/순서대로\s*(?:나열|쓰|작성)/.test(body)) return 'order'
  return pick > 1 ? 'multi' : 'single'
}

/** 글로 쓰는 입력란이 필요한지. 보기에서 고르기만 하면 되는 문제는 버튼만 둔다 */
export function needsTextInput(q: { body: string; choices?: string[]; pick: number; blanks?: unknown[] }): boolean {
  if (q.blanks?.length) return false
  return !q.choices || choiceMode(q.body, q.choices, q.pick) === 'token'
}

/** `1 : 192.168.34.1`처럼 번호 붙은 보기는 번호만 답으로 쓴다 */
export function choiceValue(choice: string): string {
  return /^(\d+|[ㄱ-ㅎ]|[a-zA-Z])\s*[:.)]\s+\S/.exec(choice)?.[1] ?? choice
}

const SEPARATOR: Record<Exclude<ChoiceMode, 'single' | 'token'>, string> = { multi: ', ', order: ' → ' }

function listOf(mode: 'multi' | 'order', text: string): string[] {
  return text
    .split(mode === 'multi' ? ',' : /→|->/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function isChosen(mode: ChoiceMode, current: string, choice: string): boolean {
  const value = choiceValue(choice)
  if (mode === 'single') return current.trim() === value
  if (mode === 'token') return false
  return listOf(mode, current).includes(value)
}

/** 보기를 눌렀을 때 새 값 */
export function applyChoice(mode: ChoiceMode, current: string, choice: string): string {
  const value = choiceValue(choice)
  if (mode === 'single') return current.trim() === value ? '' : value
  if (mode === 'token') return current + value
  const list = listOf(mode, current)
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  return next.join(SEPARATOR[mode])
}

/** 괄호 밖 쉼표로 나눈다. `원자성(A), 독립성(I)` → 2개 */
function splitList(text: string): string[] {
  const items: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of text) {
    if ('([{'.includes(ch)) depth++
    if (')]}'.includes(ch)) depth--
    if (ch === ',' && depth === 0) {
      items.push(cur)
      cur = ''
    } else cur += ch
  }
  items.push(cur)
  return items.map((s) => s.trim()).filter(Boolean)
}

export interface Grading {
  suggestion?: AttemptResult
  /** 빈칸 문제일 때 칸마다 맞았는지 */
  blanks?: boolean[]
}

/** 정답과 비교해 채점을 제안한다. 확신이 없으면 suggestion은 비워 둔다 */
export function gradeAnswer(correct: string, mine: string, blanks?: Blank[] | null): Grading {
  if (!correct.trim()) return { suggestion: mine.trim() ? undefined : 'wrong' }
  if (blanks?.length) {
    const values = splitBlanks(
      blanks.map((b) => b.label),
      mine,
    )
    const hits = blanks.map((b, i) => !!values[i].trim() && suggestByText(b.answer, values[i]) === 'correct')
    const filled = values.filter((v) => v.trim()).length
    const right = hits.filter(Boolean).length
    const suggestion = right === blanks.length ? 'correct' : filled === 0 ? 'wrong' : right > 0 ? 'partial' : undefined
    return { suggestion, blanks: hits }
  }
  const direct = suggestByText(correct, mine)
  if (direct) return { suggestion: direct }
  // 여러 개를 쉼표로 나열하는 답은 순서를 따지지 않는다. `A, B, C, D 중 3가지`면 그중 몇 개든 그 개수만큼
  const some = /^(.+?)\s*중\s*(\d+)\s*(?:가지|개)\s*$/.exec(correct.trim())
  const want = splitList(some ? some[1] : correct)
  const got = splitList(mine)
  const need = some ? Number(some[2]) : want.length
  if (want.length > 1 && got.length === need) {
    const used = new Set<number>()
    const all = got.every((g) => {
      const i = want.findIndex((w, j) => !used.has(j) && suggestByText(w, g) === 'correct')
      if (i < 0) return false
      used.add(i)
      return true
    })
    if (all) return { suggestion: 'correct' }
  }
  return {}
}
