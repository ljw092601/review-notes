/**
 * 기출문제 마크다운(`inbox/기출문제/<회차> 정보처리기사 실기.md`)과
 * 정답 파일(`... 정답.md`)을 읽어 회차 데이터로 만든다. 파일 접근 없이 문자열만 다룬다.
 */
import { parseBlanks, parseChoices, pickCount, type Blank } from './answer'

export type ExamDifficulty = '하' | '중' | '상'

export interface ExamQuestion {
  number: number
  /** 마크다운. 그림은 `![..](images/이름)` 그대로 */
  body: string
  difficulty?: ExamDifficulty
  /** 원 기출을 바꾼 문제 */
  variant: boolean
  /** 마크다운. 정답 파일이 없거나 빠진 문제면 빈 문자열 */
  answer: string
  note: string
  /** Category.id. 정답 파일에 `**유형**:`이 없으면 undefined */
  category?: string
  /** 본문 `**보기**:` 항목. 고르는 버튼으로 보여 준다 */
  choices?: string[]
  /** 정답이 `① A ② B`처럼 번호 칸이면 칸 목록. 칸마다 입력란을 따로 둔다 */
  blanks?: Blank[]
  /** 보기에서 고를 개수(문제에 "3가지 골라"처럼 쓰여 있을 때). 기본 1 */
  pick: number
}

/** past: 실제 기출(`inbox/기출문제/`), mock: 자체 출제 모의고사(`inbox/모의고사/`) */
export type ExamKind = 'past' | 'mock'

export interface Exam {
  /** `2024-1`, 모의고사는 `mock-1` */
  id: string
  kind: ExamKind
  /** 모의고사는 0 */
  year: number
  round: number
  /** `2024년 1회`, `모의고사 1회` */
  title: string
  source?: string
  questions: ExamQuestion[]
}

export interface ExamAnswer {
  answer: string
  note: string
  category?: string
}

/**
 * 파일 이름에서 연도·회차. `2024년 1회 정보처리기사 실기.md` → { kind: 'past', year: 2024, round: 1 },
 * `모의고사 2회 정보처리기사 실기.md` → { kind: 'mock', year: 0, round: 2 }
 */
export function parseExamFileName(name: string): { kind: ExamKind; year: number; round: number; isAnswer: boolean } | null {
  const base = name.split(/[\\/]/).pop() ?? name
  if (!base.endsWith('.md')) return null
  const isAnswer = /정답\.md$/.test(base)
  const past = /^(\d{4})년\s*(\d+)회/.exec(base)
  if (past) return { kind: 'past', year: Number(past[1]), round: Number(past[2]), isAnswer }
  const mock = /^모의고사\s*(\d+)회/.exec(base)
  if (mock) return { kind: 'mock', year: 0, round: Number(mock[1]), isAnswer }
  return null
}

/** 회차 목록 주소 */
export function examListPath(kind: ExamKind): string {
  return kind === 'mock' ? '/mocks' : '/exams'
}

/** `## N번` 제목으로 나눈다. 코드 블록 안의 `##`는 제목으로 보지 않는다 */
function splitSections(markdown: string): Array<{ number: number; heading: string; lines: string[] }> {
  const sections: Array<{ number: number; heading: string; lines: string[] }> = []
  let fenced = false
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const m = fenced ? null : /^##\s+(\d+)번(.*)$/.exec(line)
    if (m) {
      sections.push({ number: Number(m[1]), heading: m[2], lines: [] })
      continue
    }
    sections.at(-1)?.lines.push(line)
  }
  return sections
}

/** 앞뒤 빈 줄과 문제 끝의 `---` 구분선을 걷어낸다 */
function trimBlock(lines: string[]): string {
  const out = [...lines]
  while (out.length && !out[0].trim()) out.shift()
  while (out.length && (!out.at(-1)!.trim() || /^\s*-{3,}\s*$/.test(out.at(-1)!))) out.pop()
  return out.join('\n')
}

export function parseQuestions(markdown: string): Array<Omit<ExamQuestion, 'answer' | 'note' | 'category' | 'blanks'>> {
  return splitSections(markdown).map(({ number, heading, lines }) => {
    const level = /난이도\s*([하중상])/.exec(heading)?.[1] as ExamDifficulty | undefined
    const body = trimBlock(lines)
    return { number, body, difficulty: level, variant: heading.includes('기출변형'), choices: parseChoices(body), pick: pickCount(body) }
  })
}

/** 출처 줄 `> 출처: 정처기 감자 (...) · 총 20문제`의 출처 부분 */
export function parseSource(markdown: string): string | undefined {
  const m = /^>\s*출처:\s*(.+?)(?:\s*·\s*총\s*\d+\s*문제)?\s*$/m.exec(markdown)
  return m?.[1].trim() || undefined
}

/**
 * 정답 파일. 문제마다
 * ```
 * ## 3번
 * **유형**: sql
 * **정답**: ① SELECT ② FROM      ← 비어 있으면 다음 줄부터(코드 블록 등)가 정답
 * > 비고: ...
 * ```
 */
export function parseAnswers(markdown: string): Map<number, ExamAnswer> {
  const answers = new Map<number, ExamAnswer>()
  for (const { number, lines } of splitSections(markdown)) {
    let category: string | undefined
    const answer: string[] = []
    const note: string[] = []
    let mode: 'none' | 'answer' | 'note' = 'none'
    let fenced = false
    for (const line of lines) {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
      const isFence = /^\s*(```|~~~)/.test(line)
      if (!fenced && !isFence) {
        const cat = /^\*\*유형\*\*:\s*(\S+)/.exec(line)
        if (cat) {
          category = cat[1]
          continue
        }
        const ans = /^\*\*정답\*\*:\s*(.*)$/.exec(line)
        if (ans) {
          mode = 'answer'
          if (ans[1].trim()) answer.push(ans[1])
          continue
        }
        const memo = /^>\s?(?:비고:\s*)?(.*)$/.exec(line)
        if (memo && mode !== 'none') {
          mode = 'note'
          note.push(memo[1])
          continue
        }
      }
      if (mode === 'answer') answer.push(line)
    }
    answers.set(number, { answer: trimBlock(answer), note: trimBlock(note), category })
  }
  return answers
}

/** 문제 파일 + 정답 파일 → 회차 하나 */
export function buildExam(year: number, round: number, questionMd: string, answerMd?: string, kind: ExamKind = 'past'): Exam {
  const answers = answerMd ? parseAnswers(answerMd) : new Map<number, ExamAnswer>()
  return {
    id: kind === 'mock' ? `mock-${round}` : `${year}-${round}`,
    kind,
    year,
    round,
    title: kind === 'mock' ? `모의고사 ${round}회` : `${year}년 ${round}회`,
    source: parseSource(questionMd),
    questions: parseQuestions(questionMd).map((q) => {
      const a = answers.get(q.number)
      const answer = a?.answer ?? ''
      return { ...q, answer, note: a?.note ?? '', category: a?.category, blanks: parseBlanks(answer) ?? undefined }
    }),
  }
}

const IMAGE_REF = /!\[([^\]]*)\]\(\s*<?images\/([^)\s>]+)>?\s*\)/g

/** 본문이 참조하는 그림 파일 이름 */
export function examFigureNames(body: string): string[] {
  return [...new Set([...body.matchAll(IMAGE_REF)].map((m) => decodeURIComponent(m[2])))]
}

/** `images/이름` 참조를 바꾼다. 화면에선 실제 URL로, 오답노트에 넣을 땐 `img:이름`으로 */
export function rewriteFigures(body: string, to: (name: string) => string | undefined): string {
  return body.replace(IMAGE_REF, (whole, alt: string, raw: string) => {
    const target = to(decodeURIComponent(raw))
    return target ? `![${alt}](${target})` : whole
  })
}
