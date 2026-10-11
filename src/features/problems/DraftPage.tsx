import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Check, PencilLine, SkipForward } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CategoryBadge } from '@/components/badges'
import { ImageGallery } from '@/components/ImageGallery'
import { Markdown } from '@/components/Markdown'
import { useToast } from '@/components/toast-context'
import { Badge, Button, Card, Chip, EmptyState, SectionTitle } from '@/components/ui'
import { db, updateProblem, useCategories, useImages } from '@/db'
import { ANSWER_TYPE_LABEL } from '@/lib/labels'
import { useObjectUrl } from '@/lib/useObjectUrl'
import { usePageTitle } from '@/lib/usePageTitle'
import type { Category, ImageRecord, Problem } from '@/models/types'
import { deriveStatus } from './form'
import { MarkdownField } from './MarkdownField'

/** 사진이 입력의 핵심이라 썸네일 대신 크게 보여준다. 클릭해서 확대하는 건 갤러리가 맡는다. */
function LargeImage({ image }: { image: ImageRecord }) {
  const url = useObjectUrl(image.blob)
  if (!url) return <div className="h-48 rounded-control bg-paper-2" />
  return (
    <img src={url} alt={image.name} className="max-h-[32rem] w-auto max-w-full rounded-control border border-rule bg-paper-2 object-contain" />
  )
}

function DraftEditor({
  problem,
  category,
  onSaved,
  onSkip,
}: {
  problem: Problem
  category?: Category
  onSaved: (status: Problem['status']) => void
  onSkip: () => void
}) {
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`
  const toast = useToast()
  const images = useImages(problem.id)
  const lowConfidence = problem.answerConfidence === 'low'

  const [myAnswer, setMyAnswer] = useState(problem.myAnswer)
  const [correctAnswer, setCorrectAnswer] = useState(problem.correctAnswer)
  const [wrongReason, setWrongReason] = useState(problem.wrongReason)
  const [explanation, setExplanation] = useState(problem.explanation)
  const [editAnswer, setEditAnswer] = useState(lowConfidence)
  const [editMy, setEditMy] = useState(!problem.myAnswer.trim())
  const [saving, setSaving] = useState(false)

  const status = deriveStatus({ explanation, wrongReason })

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      await updateProblem(problem.id, { myAnswer, correctAnswer, wrongReason, explanation, status })
      if (status === 'draft') toast.show('아직 입력 필요 상태예요. 풀이와 틀린 이유를 둘 다 적으면 완료가 돼요.')
      onSaved(status)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '저장하지 못했어요', { tone: 'error' })
      setSaving(false)
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      void save()
    }
  }

  return (
    <div onKeyDown={onKeyDown}>
      <Card as="article" className="px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={category} id={problem.category} />
          <Badge>{ANSWER_TYPE_LABEL[problem.answerType]}</Badge>
          {problem.source && <span className="text-sm text-muted">{problem.source}</span>}
        </div>
        {problem.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {problem.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}

        <section className="mt-5">
          <SectionTitle>문제</SectionTitle>
          <Markdown className="mt-2.5 text-[1.02rem]">{problem.question}</Markdown>
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
          {images && images.length > 0 && (
            <div className="mt-4 space-y-3">
              {images.map((img) => (
                <LargeImage key={img.id} image={img} />
              ))}
              {images.length > 1 && <ImageGallery images={images} />}
            </div>
          )}
        </section>

        <section className="mt-6 border-t border-rule pt-5">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>정답</SectionTitle>
            {!lowConfidence && !editAnswer && (
              <button
                type="button"
                onClick={() => setEditAnswer(true)}
                className="inline-flex h-8 items-center gap-1 rounded-control px-2 text-xs text-ink-2 hover:bg-paper-2"
              >
                <PencilLine className="size-3.5" aria-hidden />
                정답 고치기
              </button>
            )}
          </div>
          {lowConfidence && (
            <p className="mt-2 rounded-control bg-warn-soft px-3 py-2 text-sm text-warn" role="status">
              Claude가 확신하지 못한 정답이에요. 확인해 주세요.
            </p>
          )}
          {editAnswer ? (
            <div className="mt-2.5">
              <MarkdownField id={id('correct')} label="정답" value={correctAnswer} onChange={setCorrectAnswer} rows={3} placeholder="정답" />
            </div>
          ) : correctAnswer.trim() ? (
            <Markdown className="mt-2.5 font-semibold text-success">{correctAnswer}</Markdown>
          ) : (
            <p className="mt-2.5 text-sm text-neutral">정답이 비어 있어요</p>
          )}
        </section>

        <section className="mt-6 border-t border-rule pt-5">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>내 답</SectionTitle>
            {!editMy && (
              <button
                type="button"
                onClick={() => setEditMy(true)}
                className="inline-flex h-8 items-center gap-1 rounded-control px-2 text-xs text-ink-2 hover:bg-paper-2"
              >
                <PencilLine className="size-3.5" aria-hidden />
                고치기
              </button>
            )}
          </div>
          {editMy ? (
            <div className="mt-2.5">
              <MarkdownField id={id('my')} label="내 답" value={myAnswer} onChange={setMyAnswer} rows={1} placeholder="시험에서 썼던 답" />
            </div>
          ) : (
            <Markdown className="mt-2.5 text-error">{myAnswer}</Markdown>
          )}
        </section>

        <section className="mt-6 border-t border-rule pt-5">
          <SectionTitle className="mb-3">되짚기</SectionTitle>
          <div className="space-y-2">
            <MarkdownField
              id={id('wrong')}
              label="틀린 이유"
              value={wrongReason}
              onChange={setWrongReason}
              rows={4}
              placeholder="개념을 헷갈렸는지, 문제를 잘못 읽었는지"
              autoFocus
            />
            <MarkdownField
              id={id('expl')}
              label="풀이"
              value={explanation}
              onChange={setExplanation}
              rows={6}
              placeholder="다음에 보면 바로 이해되게"
              helper={problem.explanation.trim() ? 'Claude가 정리한 개념이에요. 연필을 눌러 고칠 수 있어요' : undefined}
              defaultPreview={problem.explanation.trim().length > 0}
            />
            <p className={status === 'done' ? 'text-xs text-success' : 'text-xs text-warn'}>
              {status === 'done' ? '둘 다 적혀 있어서 완료로 저장돼요.' : '풀이와 틀린 이유를 둘 다 적으면 완료로 바뀌어요.'}
            </p>
          </div>
        </section>
      </Card>

      <div className="sticky bottom-0 -mx-4 mt-4 flex items-center gap-2 border-t border-rule bg-paper/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-card sm:border sm:px-4">
        <Link
          to={`/problems/${problem.id}/edit`}
          className="inline-flex h-11 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-ink-2 hover:bg-paper-2"
        >
          <PencilLine className="size-4" aria-hidden />
          전체 편집
        </Link>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={saving} icon={<SkipForward className="size-4" aria-hidden />}>
            건너뛰기
          </Button>
          <Button
            variant="primary"
            loading={saving}
            onClick={() => void save()}
            icon={status === 'done' ? <Check className="size-4" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
            title="Ctrl+Enter"
          >
            저장하고 다음
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DraftPage() {
  usePageTitle('입력 필요')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const startId = params.get('id')
  const drafts = useLiveQuery(() => db.problems.where('status').equals('draft').sortBy('createdAt'), [])
  const categories = useCategories()
  const [skipped, setSkipped] = useState<string[]>([])
  const [doneCount, setDoneCount] = useState(0)

  const queue = useMemo(() => {
    if (!drafts) return []
    const skippedSet = new Set(skipped)
    const start = startId && !skippedSet.has(startId) ? drafts.find((p) => p.id === startId) : undefined
    const fresh = drafts.filter((p) => !skippedSet.has(p.id) && p.id !== start?.id)
    const later = skipped.map((sid) => drafts.find((p) => p.id === sid)).filter((p): p is Problem => !!p)
    return [...(start ? [start] : []), ...fresh, ...later]
  }, [drafts, skipped, startId])

  if (!drafts || !categories) return null

  const current = queue[0]
  const total = doneCount + drafts.length

  function toBack(problemId: string) {
    setSkipped((list) => [...list.filter((sid) => sid !== problemId), problemId])
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">입력 필요</h1>
          <p className="mt-1 text-sm text-muted">가져온 문제에 틀린 이유를 적고, 미리 정리된 개념을 다듬으면 돼요.</p>
        </div>
        {current && (
          <p className="text-sm text-muted tabular-nums">
            <span className="font-semibold text-ink">{total}</span>개 중 <span className="font-semibold text-ink">{doneCount + 1}</span>번째 · 남은{' '}
            <span className="font-semibold text-ink">{drafts.length}</span>개
          </p>
        )}
      </div>

      <div className="mt-5">
        {current ? (
          <DraftEditor
            key={current.id}
            problem={current}
            category={categories.find((c) => c.id === current.category)}
            onSaved={(status) => {
              if (status === 'done') setDoneCount((n) => n + 1)
              else toBack(current.id)
            }}
            onSkip={() => toBack(current.id)}
          />
        ) : (
          <EmptyState
            title="입력 필요한 문제가 없어요 🎉"
            body={doneCount > 0 ? `이번에 ${doneCount}개를 마무리했어요.` : '가져오기로 문제를 불러오면 여기서 이어서 채울 수 있어요.'}
            action={
              <Button variant="primary" onClick={() => navigate('/')}>
                문제 목록으로
              </Button>
            }
          />
        )}
      </div>
    </div>
  )
}
