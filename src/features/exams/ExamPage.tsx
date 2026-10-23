import { ArrowLeft, BookPlus, ClipboardCheck, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CategoryBadge, ResultBadge } from '@/components/badges'
import { Markdown } from '@/components/Markdown'
import { useToast } from '@/components/toast-context'
import { Badge, Button, Card, EmptyState, SectionTitle } from '@/components/ui'
import { examScore, problemIdsBySource, saveExamResult, useCategories } from '@/db'
import { GRADES } from '@/features/quiz/grades'
import { cx } from '@/lib/cx'
import { usePageTitle } from '@/lib/usePageTitle'
import { DEFAULT_CATEGORIES } from '@/models/categories'
import type { AttemptResult } from '@/models/types'
import { gradeAnswer, needsTextInput } from './answer'
import { examImageUrls, findExam } from './data'
import { AnswerInput, BlankReview } from './ExamAnswer'
import { addToNotes, examSource } from './notes'
import { examListPath, rewriteFigures, type Exam, type ExamKind, type ExamQuestion } from './parse'
import { PASS_SCORE, clearDraft, initialGrades, loadDraft, saveDraft } from './session'

type Phase = 'answer' | 'grade' | 'result'

const anchor = (n: number) => `q-${n}`

function QuestionBody({ q, imageUrls }: { q: ExamQuestion; imageUrls: ReadonlyMap<string, string> }) {
  const categories = useCategories()
  // 보기는 답 입력란 아래 버튼으로 보여 주므로 본문에서는 뺀다
  const body = useMemo(() => {
    const md = rewriteFigures(q.body, (name) => imageUrls.get(name))
    return q.choices ? md.replace(/^\*\*보기\*\*\s*:.*$\n?/m, '').trimEnd() : md
  }, [q.body, q.choices, imageUrls])
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <h2 className="mr-1 text-lg font-bold tracking-tight text-ink">{q.number}번</h2>
        {q.category && <CategoryBadge category={(categories ?? DEFAULT_CATEGORIES).find((c) => c.id === q.category)} id={q.category} />}
        {q.difficulty && <Badge>난이도 {q.difficulty}</Badge>}
        {q.variant && <Badge tone="accent">기출변형</Badge>}
      </div>
      <Markdown className="mt-3 text-[1.02rem]">{body}</Markdown>
    </>
  )
}

/** 1~20 번호. 답을 쓴(또는 채점한) 문제는 색을 칠한다 */
function NumberNav({ exam, state }: { exam: Exam; state: (n: number) => 'empty' | 'filled' | AttemptResult }) {
  const tone = {
    empty: 'border-rule-2 text-ink-2 hover:bg-paper-2',
    filled: 'border-accent bg-accent-soft text-accent-deep',
    correct: 'border-success/50 bg-success-soft text-success',
    partial: 'border-warn/50 bg-warn-soft text-warn',
    wrong: 'border-error/50 bg-error-soft text-error',
  } as const
  return (
    <nav aria-label="문제 번호" className="mt-4 flex flex-wrap gap-1.5">
      {exam.questions.map((q) => (
        <a
          key={q.number}
          href={`#${anchor(q.number)}`}
          onClick={(e) => {
            e.preventDefault()
            document.getElementById(anchor(q.number))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          className={cx('flex size-9 items-center justify-center rounded-control border text-sm font-medium tabular-nums', tone[state(q.number)])}
        >
          {q.number}
        </a>
      ))}
    </nav>
  )
}

function StickyBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">{children}</div>
    </div>
  )
}

function GradeButtons({ value, onChange, label }: { value?: AttemptResult; onChange: (r: AttemptResult) => void; label: string }) {
  return (
    <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label={label}>
      {GRADES.map((g) => {
        const Icon = g.icon
        return (
          <button
            key={g.value}
            type="button"
            aria-pressed={value === g.value}
            onClick={() => onChange(g.value)}
            className={cx(
              'flex h-11 items-center justify-center gap-1 rounded-control border bg-paper text-sm font-semibold transition-[background-color,border-color] duration-(--dur-micro) active:translate-y-px',
              g.className,
            )}
          >
            <Icon className="size-4" aria-hidden />
            {g.label}
          </button>
        )
      })}
    </div>
  )
}

function Result({
  exam,
  answers,
  grades,
  onRetry,
  imageUrls,
}: {
  exam: Exam
  answers: Record<number, string>
  grades: Record<number, AttemptResult>
  onRetry: () => void
  imageUrls: ReadonlyMap<string, string>
}) {
  const toast = useToast()
  const categories = useCategories()
  const score = examScore(grades, exam.questions.length)
  const counts = { correct: 0, partial: 0, wrong: 0 }
  for (const q of exam.questions) counts[grades[q.number] ?? 'wrong']++
  const [inNotes, setInNotes] = useState<Map<string, string>>()
  const [picked, setPicked] = useState<Set<number>>(() => new Set())
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let alive = true
    void problemIdsBySource(exam.questions.map((q) => examSource(exam, q))).then((found) => {
      if (!alive) return
      setInNotes(found)
      setPicked(new Set(exam.questions.filter((q) => grades[q.number] !== 'correct' && !found.has(examSource(exam, q))).map((q) => q.number)))
    })
    return () => {
      alive = false
    }
  }, [exam, grades])

  function toggle(n: number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  async function add() {
    setAdding(true)
    try {
      const items = exam.questions
        .filter((q) => picked.has(q.number))
        .map((q) => ({ question: q, answer: answers[q.number] ?? '', result: grades[q.number] ?? 'wrong' }))
      const { created, updated } = await addToNotes(exam, items, { categoryIds: new Set(categories?.map((c) => c.id)), imageUrls })
      toast.show(updated ? `오답노트에 ${created}문제를 넣고, 이미 있던 ${updated}문제엔 복습 기록을 더했어요` : `오답노트에 ${created}문제를 넣었어요`)
      setInNotes(await problemIdsBySource(exam.questions.map((q) => examSource(exam, q))))
      setPicked(new Set())
    } catch {
      toast.show('오답노트에 넣지 못했어요')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className={cx('rounded-card px-4 py-4 text-center', score >= PASS_SCORE ? 'bg-success-soft text-success' : 'bg-error-soft text-error')}>
          <p className="text-2xl font-bold tabular-nums">{score}점</p>
          <p className="mt-0.5 text-xs font-medium">{score >= PASS_SCORE ? '합격선 이상' : `합격선 ${PASS_SCORE}점 미만`}</p>
        </div>
        {(
          [
            ['맞음', counts.correct, 'text-success bg-success-soft'],
            ['부분', counts.partial, 'text-warn bg-warn-soft'],
            ['틀림', counts.wrong, 'text-error bg-error-soft'],
          ] as const
        ).map(([label, n, cls]) => (
          <div key={label} className={`rounded-card px-4 py-4 text-center ${cls}`}>
            <p className="text-2xl font-bold tabular-nums">{n}</p>
            <p className="mt-0.5 text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral">문항마다 {Math.round(100 / exam.questions.length)}점, 부분은 절반으로 계산했어요.</p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-2">
        <SectionTitle>오답노트에 넣을 문제</SectionTitle>
        <span className="text-xs text-neutral">틀림·부분은 미리 골라 뒀어요. 넣으면 '입력 필요'에 들어가요.</span>
      </div>
      <Card className="mt-2 divide-y divide-rule">
        {exam.questions.map((q) => {
          const already = inNotes?.has(examSource(exam, q))
          return (
            <label key={q.number} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-paper-2 sm:px-5">
              <input type="checkbox" className="size-4 accent-(--color-accent)" checked={picked.has(q.number)} onChange={() => toggle(q.number)} />
              <span className="w-10 shrink-0 text-sm font-medium text-ink tabular-nums">{q.number}번</span>
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-ink-2">{answers[q.number]?.trim() || '(비워 둠)'}</span>
              {already && (
                <Link to={`/problems/${inNotes!.get(examSource(exam, q))}`} className="shrink-0 text-xs text-accent-deep underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
                  오답노트에 있음
                </Link>
              )}
              <ResultBadge result={grades[q.number] ?? 'wrong'} />
            </label>
          )
        })}
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" icon={<BookPlus className="size-4" aria-hidden />} disabled={picked.size === 0} loading={adding} onClick={() => void add()}>
          오답노트에 넣기 ({picked.size})
        </Button>
        <Button icon={<RotateCcw className="size-4" aria-hidden />} onClick={onRetry}>
          다시 풀기
        </Button>
        <Link to={examListPath(exam.kind)} className="inline-flex h-11 items-center rounded-control px-4 text-[0.925rem] font-medium text-ink-2 hover:bg-paper-2">
          회차 목록으로
        </Link>
      </div>
    </div>
  )
}

/** 회차 하나 풀기: 답 쓰기 → 정답 보며 채점 → 결과 */
export function ExamSession({ exam, imageUrls = examImageUrls }: { exam: Exam; imageUrls?: ReadonlyMap<string, string> }) {
  const toast = useToast()
  const [phase, setPhase] = useState<Phase>('answer')
  const [answers, setAnswers] = useState<Record<number, string>>(() => loadDraft(exam.id))
  const [grades, setGrades] = useState<Record<number, AttemptResult>>({})
  const total = exam.questions.length
  const written = exam.questions.filter((q) => answers[q.number]?.trim()).length
  const graded = exam.questions.filter((q) => grades[q.number]).length

  useEffect(() => {
    if (phase === 'answer') saveDraft(exam.id, answers)
  }, [exam.id, answers, phase])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [phase])

  function submit() {
    const blanks = total - written
    if (blanks > 0 && !window.confirm(`아직 ${blanks}문제를 비워 뒀어요. 채점할까요? 빈 문제는 틀림으로 매겨져요.`)) return
    setGrades(initialGrades(exam, answers))
    setPhase('grade')
  }

  async function finish() {
    const results: Record<number, AttemptResult> = {}
    for (const q of exam.questions) results[q.number] = grades[q.number] ?? 'wrong'
    setGrades(results)
    try {
      await saveExamResult({ examId: exam.id, answers, results, score: examScore(results, total) })
    } catch {
      toast.show('풀이 기록을 저장하지 못했어요')
    }
    clearDraft(exam.id)
    setPhase('result')
  }

  function retry() {
    setAnswers({})
    setGrades({})
    setPhase('answer')
  }

  return (
    <div>
      <Link to={examListPath(exam.kind)} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        회차 목록
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        {exam.title} 정보처리기사 실기
        {phase === 'grade' && <span className="text-muted"> · 채점</span>}
        {phase === 'result' && <span className="text-muted"> · 결과</span>}
      </h1>
      <p className="mt-1 text-sm text-muted tabular-nums" aria-live="polite">
        {phase === 'answer' && `${total}문제 · ${written}문제 작성 · 쓰던 답은 이 브라우저에 자동 저장돼요`}
        {phase === 'grade' && `정답을 보고 맞음·부분·틀림을 골라 주세요 · ${graded}/${total} 채점`}
        {phase === 'result' && (exam.source ? `출처: ${exam.source}` : '')}
      </p>

      {phase === 'result' ? (
        <Result exam={exam} answers={answers} grades={grades} onRetry={retry} imageUrls={imageUrls} />
      ) : (
        <>
          <NumberNav exam={exam} state={(n) => (phase === 'grade' ? (grades[n] ?? 'empty') : answers[n]?.trim() ? 'filled' : 'empty')} />
          <div className="mt-4 grid gap-4">
            {exam.questions.map((q) => (
              <Card key={q.number} as="article" className="px-5 py-5 sm:px-7 sm:py-6">
                <div id={anchor(q.number)} className="scroll-mt-20" />
                <QuestionBody q={q} imageUrls={imageUrls} />
                {phase === 'answer' ? (
                  <section className="mt-5 border-t border-rule pt-4" aria-label={`${q.number}번 내 답`}>
                    {!needsTextInput(q) ? (
                      <SectionTitle>내 답</SectionTitle>
                    ) : (
                      <label htmlFor={`a-${q.number}`} className="text-sm font-semibold tracking-wide text-muted">
                        내 답
                      </label>
                    )}
                    <AnswerInput q={q} value={answers[q.number] ?? ''} onChange={(v) => setAnswers((prev) => ({ ...prev, [q.number]: v }))} />
                  </section>
                ) : q.blanks && q.answer ? (
                  <section className="mt-5 border-t border-rule pt-4" aria-label={`${q.number}번 정답`}>
                    <SectionTitle>내 답과 정답</SectionTitle>
                    <BlankReview q={q} value={answers[q.number] ?? ''} grading={gradeAnswer(q.answer, answers[q.number] ?? '', q.blanks)} />
                    {q.note && <p className="mt-2 text-sm text-muted">{q.note}</p>}
                    <GradeButtons value={grades[q.number]} label={`${q.number}번 채점`} onChange={(r) => setGrades((prev) => ({ ...prev, [q.number]: r }))} />
                  </section>
                ) : (
                  <>
                    <section className="mt-5 border-t border-rule pt-4" aria-label={`${q.number}번 내 답`}>
                      <SectionTitle>내 답</SectionTitle>
                      <p className="mt-2 whitespace-pre-wrap font-mono text-ink">
                        {answers[q.number]?.trim() || <span className="font-sans text-sm text-neutral">(비워 둠)</span>}
                      </p>
                    </section>
                    <section className="mt-5 border-t border-rule pt-4" aria-label={`${q.number}번 정답`}>
                      <SectionTitle>정답</SectionTitle>
                      {q.answer ? (
                        <Markdown className="mt-2 font-semibold text-success">{q.answer}</Markdown>
                      ) : (
                        <p className="mt-2 text-sm text-neutral">정답 파일에 이 문제의 정답이 없어요.</p>
                      )}
                      {q.note && <p className="mt-2 text-sm text-muted">{q.note}</p>}
                      <GradeButtons value={grades[q.number]} label={`${q.number}번 채점`} onChange={(r) => setGrades((prev) => ({ ...prev, [q.number]: r }))} />
                    </section>
                  </>
                )}
              </Card>
            ))}
          </div>
          <StickyBar>
            {phase === 'answer' ? (
              <>
                <span className="text-sm text-muted tabular-nums">
                  {written}/{total} 작성
                </span>
                <Button variant="primary" icon={<ClipboardCheck className="size-4" aria-hidden />} onClick={submit}>
                  제출하고 채점하기
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted tabular-nums">
                  {graded}/{total} 채점{graded < total && ' · 안 고른 문제는 틀림으로 처리돼요'}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setPhase('answer')}>
                    답 고치기
                  </Button>
                  <Button variant="primary" onClick={() => void finish()}>
                    결과 보기
                  </Button>
                </div>
              </>
            )}
          </StickyBar>
        </>
      )}
    </div>
  )
}

export function ExamPage({ kind = 'past' }: { kind?: ExamKind }) {
  const { id } = useParams()
  const found = findExam(id)
  const exam = found?.kind === kind ? found : undefined
  const label = kind === 'mock' ? '모의고사' : '기출'
  usePageTitle(exam ? (kind === 'mock' ? exam.title : `${exam.title} 기출`) : label)
  if (!exam) {
    return (
      <EmptyState
        title="이 회차를 찾을 수 없어요"
        body={`inbox/${kind === 'mock' ? '모의고사' : '기출문제'} 폴더에 해당 회차 파일이 있는지 확인해 주세요.`}
        action={
          <Link to={examListPath(kind)} className="inline-flex h-11 items-center rounded-control border border-rule-2 px-4 text-[0.925rem] font-medium text-ink hover:bg-paper-2">
            회차 목록으로
          </Link>
        }
      />
    )
  }
  return <ExamSession key={exam.id} exam={exam} />
}
