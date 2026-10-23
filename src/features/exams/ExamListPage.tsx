import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card, EmptyState } from '@/components/ui'
import { useExamResults } from '@/db'
import { relativeDate } from '@/lib/text'
import { usePageTitle } from '@/lib/usePageTitle'
import { EXAMS, MOCKS } from './data'
import { PASS_SCORE } from './session'
import { examListPath, type Exam, type ExamKind } from './parse'

const variantCount = (exam: Exam) => exam.questions.filter((q) => q.variant).length

/** 기출은 연도별로, 모의고사는 한 묶음으로 */
function groupsOf(kind: ExamKind, exams: readonly Exam[]): Array<[string, Exam[]]> {
  if (kind === 'mock') return [['모의고사', [...exams]]]
  const groups = new Map<string, Exam[]>()
  for (const e of exams) groups.set(`${e.year}년`, [...(groups.get(`${e.year}년`) ?? []), e])
  return [...groups.entries()]
}

const TEXT = {
  past: {
    title: '기출 풀기',
    intro: '회차를 골라 시험처럼 풀고, 정답을 보며 직접 채점해요. 틀린 문제는 오답노트로 옮길 수 있어요.',
    emptyTitle: '기출문제 파일이 없어요',
    emptyBody: "inbox/기출문제 폴더에 '2024년 1회 정보처리기사 실기.md' 같은 파일을 넣으면 여기에 나와요.",
  },
  mock: {
    title: '모의고사',
    intro: '최신 기출 경향으로 만든 변형·예상 문제예요. 푸는 방법과 채점은 기출 풀기와 같아요.',
    emptyTitle: '모의고사 파일이 없어요',
    emptyBody: "inbox/모의고사 폴더에 '모의고사 1회 정보처리기사 실기.md' 같은 파일을 넣으면 여기에 나와요.",
  },
} as const

export function ExamListPage({ kind = 'past', exams = kind === 'mock' ? MOCKS : EXAMS }: { kind?: ExamKind; exams?: readonly Exam[] }) {
  const text = TEXT[kind]
  usePageTitle(kind === 'mock' ? '모의고사' : '기출')
  const results = useExamResults()

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{text.title}</h1>
      <p className="mt-1 text-sm text-muted">{text.intro}</p>

      {exams.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={text.emptyTitle} body={text.emptyBody} />
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {groupsOf(kind, exams).map(([group, list], gi) => (
            <section key={group} aria-labelledby={`g-${gi}`}>
              <h2 id={`g-${gi}`} className="text-sm font-semibold tracking-wide text-muted">
                {group}
              </h2>
              <Card className="mt-2 divide-y divide-rule">
                {list.map((exam) => {
                  const history = results?.get(exam.id) ?? []
                  const last = history[0]
                  const best = history.length ? Math.max(...history.map((r) => r.score)) : undefined
                  return (
                    <Link key={exam.id} to={`${examListPath(exam.kind)}/${exam.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-paper-2 sm:px-5">
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-ink">{exam.round}회</span>
                        <span className="mt-0.5 block text-xs text-neutral tabular-nums">
                          {exam.questions.length}문제
                          {kind === 'mock' && variantCount(exam) > 0 && ` · 기출변형 ${variantCount(exam)}`}
                          {last ? ` · ${history.length}번 풂 · 최근 ${relativeDate(last.takenAt)}` : ' · 아직 안 풂'}
                        </span>
                      </span>
                      {last && (
                        <span className="flex shrink-0 items-center gap-1.5">
                          {best !== undefined && history.length > 1 && <span className="hidden text-xs text-neutral sm:inline tabular-nums">최고 {best}점</span>}
                          <Badge tone={last.score >= PASS_SCORE ? 'success' : 'error'} className="tabular-nums">
                            {last.score}점
                          </Badge>
                        </span>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-neutral" aria-hidden />
                    </Link>
                  )
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
