import { ArrowLeft, ListTodo, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CategoryBadge, ResultBadge, StatusBadge } from '@/components/badges'
import { ANSWER_TYPE_LABEL } from '@/lib/labels'
import { ImageGallery } from '@/components/ImageGallery'
import { Markdown } from '@/components/Markdown'
import { useToast } from '@/components/toast-context'
import { Badge, Button, Card, Chip, EmptyState, SectionTitle } from '@/components/ui'
import { cx } from '@/lib/cx'
import { deleteProblemWithSnapshot, restoreProblem, useAttempts, useCategories, useImages, useProblem } from '@/db'
import { excerpt, formatDate, formatDateTime } from '@/lib/text'
import { usePageTitle } from '@/lib/usePageTitle'

function Section({ title, children, muted, className }: { title: string; children: ReactNode; muted?: boolean; className?: string }) {
  return (
    <section className={cx('py-5 first:pt-0 last:pb-0', className)}>
      <SectionTitle className={muted ? 'text-neutral' : undefined}>{title}</SectionTitle>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

function Missing({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral">{children}</p>
}

export function ProblemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const problem = useProblem(id)
  const images = useImages(id)
  const attempts = useAttempts(id)
  const categories = useCategories()
  const category = useMemo(() => categories?.find((c) => c.id === problem?.category), [categories, problem])
  const [deleting, setDeleting] = useState(false)
  usePageTitle(problem ? excerpt(problem.question, 40) : problem === null ? '문제 없음' : undefined)

  if (problem === undefined) return null
  if (problem === null) {
    return (
      <EmptyState
        title="문제를 찾을 수 없어요"
        body="삭제되었거나 주소가 잘못되었을 수 있어요."
        action={<Button onClick={() => navigate('/')}>목록으로</Button>}
      />
    )
  }

  async function remove() {
    if (!problem) return
    setDeleting(true)
    const snapshot = await deleteProblemWithSnapshot(problem.id)
    navigate('/', { replace: true })
    if (snapshot) {
      toast.show('문제를 삭제했어요', {
        action: { label: '되돌리기', onClick: () => void restoreProblem(snapshot) },
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex h-9 items-center gap-1 rounded-control px-2 text-sm text-ink-2 hover:bg-paper-2">
          <ArrowLeft className="size-4" aria-hidden />
          목록
        </Link>
        <div className="flex gap-2">
          {problem.status === 'draft' && (
            <Button size="sm" variant="ghost" icon={<ListTodo className="size-4" aria-hidden />} onClick={() => navigate(`/drafts?id=${problem.id}`)}>
              <span className="hidden sm:inline">입력 필요 화면에서 채우기</span>
              <span className="sm:hidden">채우기</span>
            </Button>
          )}
          <Button size="sm" icon={<Pencil className="size-4" aria-hidden />} onClick={() => navigate(`/problems/${problem.id}/edit`)}>
            편집
          </Button>
          <Button size="sm" variant="danger" loading={deleting} icon={<Trash2 className="size-4" aria-hidden />} onClick={remove}>
            삭제
          </Button>
        </div>
      </div>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={category} id={problem.category} />
          <Badge>{ANSWER_TYPE_LABEL[problem.answerType]}</Badge>
          <StatusBadge status={problem.status} />
          {problem.source && <span className="text-sm text-muted">{problem.source}</span>}
        </div>
        <p className="mt-2 text-xs text-neutral">
          {problem.certification} · {formatDate(problem.createdAt)} 기록
        </p>
        {problem.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {problem.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}
      </header>

      <Card as="article" className="mt-5 divide-y divide-rule px-5 py-5 sm:px-7 sm:py-6">
        <Section title="문제">
          <Markdown className="text-[1.02rem]">{problem.question}</Markdown>
          {problem.answerType === 'choice' && problem.choices && problem.choices.length > 0 && (
            <ol className="mt-3 space-y-1 text-[0.975rem]">
              {problem.choices.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-5 shrink-0 text-right text-neutral tabular-nums">{i + 1}.</span>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
          )}
          {images && images.length > 0 && <ImageGallery className="mt-4" images={images} />}
        </Section>

        <Section title="내 답">
          {problem.myAnswer.trim() ? (
            <Markdown className="text-error">{problem.myAnswer}</Markdown>
          ) : (
            <Missing>기록 안 함</Missing>
          )}
        </Section>

        <Section title="정답">
          {problem.correctAnswer.trim() ? (
            <>
              <Markdown className="font-semibold text-success">{problem.correctAnswer}</Markdown>
              {problem.answerConfidence === 'low' && (
                <p className="mt-2 text-xs text-warn">Claude가 직접 푼 답이라 확신이 낮아요. 교재와 대조해 주세요.</p>
              )}
            </>
          ) : (
            <Missing>정답이 비어 있어요</Missing>
          )}
        </Section>

        <Section title="풀이" muted={!problem.explanation.trim()}>
          {problem.explanation.trim() ? (
            <Markdown>{problem.explanation}</Markdown>
          ) : (
            <Missing>
              아직 풀이를 적지 않았어요.{' '}
              <Link to={`/problems/${problem.id}/edit`} className="text-accent-deep underline underline-offset-2">
                지금 적기
              </Link>
            </Missing>
          )}
        </Section>

        <Section title="틀린 이유" muted={!problem.wrongReason.trim()}>
          {problem.wrongReason.trim() ? (
            <Markdown>{problem.wrongReason}</Markdown>
          ) : (
            <Missing>
              아직 틀린 이유를 적지 않았어요.{' '}
              <Link to={`/problems/${problem.id}/edit`} className="text-accent-deep underline underline-offset-2">
                지금 적기
              </Link>
            </Missing>
          )}
        </Section>
      </Card>

      <section className="mt-8">
        <SectionTitle>복습 이력</SectionTitle>
        {!attempts || attempts.length === 0 ? (
          <p className="mt-2 text-sm text-neutral">아직 다시 풀어본 적이 없어요.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {attempts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-control border border-rule bg-paper px-4 py-2.5 text-sm">
                <ResultBadge result={a.result} />
                <span className="text-xs text-neutral tabular-nums">{formatDateTime(a.attemptedAt)}</span>
                {a.answer.trim() && <span className="basis-full text-ink-2 sm:basis-auto">내 답: {a.answer}</span>}
                {a.memo && <span className="basis-full text-muted">{a.memo}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
