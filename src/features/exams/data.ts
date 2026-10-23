import { buildExam, parseExamFileName, type Exam, type ExamKind } from './parse'

/**
 * `inbox/기출문제/`·`inbox/모의고사/`의 마크다운과 그림을 빌드 시점에 읽는다. inbox는 gitignore라
 * 폴더가 없는 환경(새로 clone한 경우 등)에서는 빈 목록이 된다.
 */
const markdownFiles = import.meta.glob<string>(['/inbox/기출문제/*.md', '/inbox/모의고사/*.md'], {
  query: '?raw',
  import: 'default',
  eager: true,
})
const imageFiles = import.meta.glob<string>(
  ['/inbox/기출문제/images/*.{png,jpg,jpeg,gif,webp,svg}', '/inbox/모의고사/images/*.{png,jpg,jpeg,gif,webp,svg}'],
  { query: '?url', import: 'default', eager: true },
)

/** 그림 파일 이름 → 브라우저에서 열 수 있는 URL */
export const examImageUrls: ReadonlyMap<string, string> = new Map(
  Object.entries(imageFiles).map(([path, url]) => [path.split('/').pop()!, url]),
)

/** 회차 목록을 만든다. 테스트에서 파일 묶음을 직접 넘길 수 있다 */
export function loadExams(files: Record<string, string>): Exam[] {
  const questions = new Map<string, { kind: ExamKind; year: number; round: number; md: string }>()
  const answers = new Map<string, string>()
  for (const [path, md] of Object.entries(files)) {
    const info = parseExamFileName(path)
    if (!info) continue
    const id = `${info.kind}-${info.year}-${info.round}`
    if (info.isAnswer) answers.set(id, md)
    else questions.set(id, { ...info, md })
  }
  return [...questions.entries()]
    .map(([id, q]) => buildExam(q.year, q.round, q.md, answers.get(id), q.kind))
    .filter((exam) => exam.questions.length > 0)
    .sort((a, b) => b.year - a.year || b.round - a.round)
}

const ALL: readonly Exam[] = loadExams(markdownFiles)

/** 실제 기출, 최신 회차부터 */
export const EXAMS: readonly Exam[] = ALL.filter((e) => e.kind === 'past')
/** 모의고사, 1회부터 */
export const MOCKS: readonly Exam[] = ALL.filter((e) => e.kind === 'mock').reverse()

export function findExam(id: string | undefined): Exam | undefined {
  return ALL.find((e) => e.id === id)
}
