import { Check, Eye, LogOut, Minus, X } from 'lucide-react'
import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { CategoryBadge } from '@/components/badges'
import { ImageGallery } from '@/components/ImageGallery'
import { Markdown } from '@/components/Markdown'
import { Button, Card, SectionTitle, Textarea } from '@/components/ui'
import { useCategories, useImages } from '@/db'
import { cx } from '@/lib/cx'
import { ANSWER_TYPE_LABEL } from '@/lib/labels'
import type { AttemptResult, Problem } from '@/models/types'
import { suggestResult, type QuizState } from './session'

const GRADES: Array<{ value: AttemptResult; label: string; key: string; icon: typeof Check; className: string }> = [
  { value: 'wrong', label: '틀림', key: '1', icon: X, className: 'border-error/40 text-error hover:bg-error-soft aria-pressed:bg-error-soft aria-pressed:border-error' },
  { value: 'partial', label: '부분', key: '2', icon: Minus, className: 'border-warn/40 text-warn hover:bg-warn-soft aria-pressed:bg-warn-soft aria-pressed:border-warn' },
  { value: 'correct', label: '맞음', key: '3', icon: Check, className: 'border-success/40 text-success hover:bg-success-soft aria-pressed:bg-success-soft aria-pressed:border-success' },
]

function Question({ problem, uid }: { problem: Problem; uid: string }) {
  const categories = useCategories()
  const images = useImages(problem.id)
  const category = categories?.find((c) => c.id === problem.category)
  return (
    <section aria-labelledby={`${uid}-q`}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral">
        <CategoryBadge category={category} id={problem.category} />
        <span>{ANSWER_TYPE_LABEL[problem.answerType]}</span>
        {problem.source && <span>· {problem.source}</span>}
      </div>
      <SectionTitle className="mt-4">
        <span id={`${uid}-q`}>문제</span>
      </SectionTitle>
      <Markdown className="mt-2 text-[1.05rem]">{problem.question}</Markdown>
      {images && images.length > 0 && <ImageGallery className="mt-4" images={images} />}
    </section>
  )
}

/** 한 문제: 답 쓰기 → 정답 확인 → 채점 */
function Item({
  problem,
  phase,
  onReveal,
  onGrade,
}: {
  problem: Problem
  phase: 'answer' | 'reveal'
  onReveal: (answer: string) => void
  onGrade: (result: AttemptResult) => void
}) {
  const uid = useId()
  const [answer, setAnswer] = useState('')
  const [picked, setPicked] = useState<AttemptResult>()
  const isChoice = problem.answerType === 'choice' && !!problem.choices?.length
  const suggestion = phase === 'reveal' ? suggestResult(problem, answer) : undefined
  const highlight = picked ?? suggestion

  // 채점 단계에서 1/2/3 키
  useEffect(() => {
    if (phase !== 'reveal') return
    function onKey(e: KeyboardEvent | globalThis.KeyboardEvent) {
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      const g = GRADES.find((x) => x.key === e.key)
      if (g) {
        e.preventDefault()
        onGrade(g.value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, onGrade])

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onReveal(answer)
    }
  }

  return (
    <Card as="article" className="mt-4 px-5 py-5 sm:px-7 sm:py-6">
      <Question problem={problem} uid={uid} />

      <section className="mt-6 border-t border-rule pt-5" aria-label="내 답">
        <label htmlFor={`${uid}-a`} className="text-sm font-semibold tracking-wide text-muted">
          내 답
        </label>
        {isChoice ? (
          <div className="mt-2 grid gap-1.5" role="radiogroup" aria-label="보기">
            {problem.choices!.map((c, i) => {
              const on = answer === c
              return (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={phase === 'reveal'}
                  onClick={() => setAnswer(on ? '' : c)}
                  className={cx(
                    'flex items-start gap-2.5 rounded-control border px-3.5 py-2.5 text-left text-[0.975rem] transition-[background-color,border-color] duration-(--dur-micro) disabled:cursor-default',
                    on ? 'border-accent bg-accent-soft text-accent-deep' : 'border-rule-2 bg-paper hover:bg-paper-2 disabled:hover:bg-paper',
                  )}
                >
                  <span className="w-5 shrink-0 text-right text-neutral tabular-nums">{i + 1}.</span>
                  <span>{c}</span>
                </button>
              )
            })}
          </div>
        ) : phase === 'answer' ? (
          <Textarea
            id={`${uid}-a`}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onKeyDown}
            rows={problem.answerType === 'essay' ? 5 : 2}
            placeholder={problem.answerType === 'essay' ? '핵심만 문장으로' : '답을 적어 보세요'}
            autoFocus
            className="mt-2 font-mono"
          />
        ) : (
          <div className="mt-2 min-h-[2.5rem]">
            {answer.trim() ? <Markdown className="font-mono text-ink">{answer}</Markdown> : <p className="text-sm text-neutral">(비워 둠)</p>}
          </div>
        )}
        {phase === 'answer' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="primary" icon={<Eye className="size-4" aria-hidden />} onClick={() => onReveal(answer)}>
              정답 확인
            </Button>
            <span className="text-xs text-neutral">Ctrl+Enter</span>
          </div>
        )}
      </section>

      {phase === 'reveal' && (
        <>
          <section className="mt-6 border-t border-rule pt-5" aria-label="정답">
            <SectionTitle>정답</SectionTitle>
            <Markdown className="mt-2 text-[1.05rem] font-semibold text-success">{problem.correctAnswer}</Markdown>
            {problem.myAnswer.trim() && (
              <p className="mt-2 text-xs text-neutral">
                시험 때 쓴 답: <span className="text-error">{problem.myAnswer}</span>
              </p>
            )}
          </section>
          {(problem.explanation.trim() || problem.wrongReason.trim()) && (
            <section className="mt-5 grid gap-4 border-t border-rule pt-5 sm:grid-cols-2">
              {problem.explanation.trim() && (
                <div>
                  <SectionTitle>풀이</SectionTitle>
                  <Markdown className="mt-2 text-[0.95rem]">{problem.explanation}</Markdown>
                </div>
              )}
              {problem.wrongReason.trim() && (
                <div>
                  <SectionTitle>그때 틀린 이유</SectionTitle>
                  <Markdown className="mt-2 text-[0.95rem]">{problem.wrongReason}</Markdown>
                </div>
              )}
            </section>
          )}
          <section className="mt-6 border-t border-rule pt-5" aria-label="채점">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>이번엔 어땠어요?</SectionTitle>
              {suggestion && <span className="text-xs text-neutral">정답과 비교해 {suggestion === 'correct' ? '맞음' : '틀림'}으로 보여요. 직접 고르세요.</span>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {GRADES.map((g) => {
                const Icon = g.icon
                return (
                  <button
                    key={g.value}
                    type="button"
                    aria-pressed={highlight === g.value}
                    onClick={() => {
                      setPicked(g.value)
                      onGrade(g.value)
                    }}
                    className={cx(
                      'flex h-14 flex-col items-center justify-center gap-0.5 rounded-control border bg-paper text-sm font-semibold transition-[background-color,border-color] duration-(--dur-micro) active:translate-y-px',
                      g.className,
                    )}
                  >
                    <span className="flex items-center gap-1">
                      <Icon className="size-4" aria-hidden />
                      {g.label}
                    </span>
                    <kbd className="text-[0.65rem] font-normal text-neutral">{g.key}</kbd>
                  </button>
                )
              })}
            </div>
          </section>
        </>
      )}
    </Card>
  )
}

export function QuizSession({
  state,
  onReveal,
  onGrade,
  onQuit,
}: {
  state: QuizState
  onReveal: (answer: string) => void
  onGrade: (result: AttemptResult) => void
  onQuit: () => void
}) {
  const current = state.problems[state.index]
  const total = state.problems.length
  const done = state.index
  if (!current || state.phase === 'summary') return null

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">복습</h1>
          <p className="mt-1 text-sm text-muted tabular-nums" aria-live="polite">
            {total}개 중 {state.index + 1}번째
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<LogOut className="size-4" aria-hidden />} onClick={onQuit}>
          그만하기
        </Button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-paper-3" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="진행">
        <div className="h-full rounded-pill bg-accent transition-[width] duration-(--dur-short) ease-(--ease-out)" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <Item key={current.id} problem={current} phase={state.phase} onReveal={onReveal} onGrade={onGrade} />
    </div>
  )
}
