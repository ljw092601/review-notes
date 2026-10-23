import { Check, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { Input, Textarea } from '@/components/ui'
import { cx } from '@/lib/cx'
import { applyChoice, choiceMode, choiceValue, isChosen, joinBlanks, needsTextInput, splitBlanks, type ChoiceMode, type Grading } from './answer'
import type { ExamQuestion } from './parse'

const MODE_HINT: Record<ChoiceMode, string> = {
  single: '보기에서 하나를 골라요. 다시 누르면 취소돼요',
  multi: '여러 개 고를 수 있어요',
  order: '누른 순서대로 이어져요. 다시 누르면 빠져요',
  token: '누르면 뒤에 이어 붙어요. 직접 고쳐도 돼요',
}

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/** 답 입력. 번호 빈칸이면 칸마다 입력란, 보기가 있으면 고르는 버튼 */
export function AnswerInput({ q, value, onChange }: { q: ExamQuestion; value: string; onChange: (value: string) => void }) {
  const labels = q.blanks?.map((b) => b.label)
  const values = labels ? splitBlanks(labels, value) : []
  const [focused, setFocused] = useState(0)
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const mode = q.choices ? choiceMode(q.body, q.choices, q.pick) : 'single'

  function setBlank(i: number, v: string) {
    const next = [...values]
    next[i] = v
    onChange(joinBlanks(labels!, next))
  }

  function pick(choice: string) {
    if (!labels) {
      onChange(applyChoice(mode, value, choice))
      return
    }
    const cur = values[focused] ?? ''
    setBlank(focused, mode === 'token' ? cur + choiceValue(choice) : cur.trim() === choiceValue(choice) ? '' : choiceValue(choice))
    if (mode === 'token') {
      refs.current[focused]?.focus()
      return
    }
    // 다음 빈 칸으로
    const nextEmpty = values.findIndex((v, i) => i > focused && !v.trim())
    if (nextEmpty >= 0) {
      setFocused(nextEmpty)
      refs.current[nextEmpty]?.focus()
    }
  }

  const chosen = (choice: string) =>
    labels ? mode !== 'token' && values[focused]?.trim() === choiceValue(choice) : isChosen(mode, value, choice)
  const order = (choice: string) => (mode === 'order' ? value.split(/→|->/).map((v) => v.trim()).indexOf(choiceValue(choice)) + 1 : 0)
  const used = (choice: string) => !!labels && mode !== 'token' && values.some((v) => v.trim() === choiceValue(choice))

  return (
    <div className="mt-2">
      {labels ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {labels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <label htmlFor={`a-${q.number}-${i}`} className={cx('w-9 shrink-0 text-center font-semibold', focused === i && q.choices ? 'text-accent-deep' : 'text-ink-2')}>
                {label}
              </label>
              <Input
                id={`a-${q.number}-${i}`}
                ref={(el) => {
                  refs.current[i] = el
                }}
                value={values[i]}
                onFocus={() => setFocused(i)}
                onChange={(e) => setBlank(i, e.target.value)}
                autoComplete="off"
                className={cx('font-mono', focused === i && q.choices && 'border-accent')}
              />
            </div>
          ))}
        </div>
      ) : needsTextInput(q) ? (
        <Textarea
          id={`a-${q.number}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="답을 적어 보세요"
          className="font-mono"
        />
      ) : null}
      {q.choices && (
        <div className={labels || needsTextInput(q) ? 'mt-3' : ''}>
          <p className="text-xs text-neutral">
            {labels && mode !== 'token' ? `보기를 누르면 ${labels[focused]} 칸에 들어가요` : MODE_HINT[mode]}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`${q.number}번 보기`}>
            {q.choices.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={chosen(c)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
                className={cx(
                  'min-h-9 rounded-control border px-3 py-1 text-left text-sm transition-[background-color,border-color] duration-(--dur-micro) active:translate-y-px',
                  chosen(c)
                    ? 'border-accent bg-accent-soft font-medium text-accent-deep'
                    : used(c)
                      ? 'border-rule bg-paper-2 text-neutral'
                      : 'border-rule-2 bg-paper text-ink hover:bg-paper-2',
                  mode === 'token' && 'font-mono',
                )}
              >
                {mode === 'order' && order(c) > 0 && <span className="mr-1.5 font-semibold tabular-nums">{CIRCLED[order(c) - 1] ?? order(c)}</span>}
                {c}
              </button>
            ))}
          </div>
          {mode === 'order' && value.trim() && <p className="mt-2 text-sm text-ink">{value}</p>}
        </div>
      )}
    </div>
  )
}

/** 채점 화면의 빈칸별 대조표 */
export function BlankReview({ q, value, grading }: { q: ExamQuestion; value: string; grading: Grading }) {
  const blanks = q.blanks!
  const values = splitBlanks(
    blanks.map((b) => b.label),
    value,
  )
  return (
    <table className="mt-2 w-full border-collapse text-[0.95rem]">
      <thead>
        <tr className="text-left text-xs text-muted">
          <th className="w-10 py-1.5 font-semibold">칸</th>
          <th className="py-1.5 font-semibold">내 답</th>
          <th className="py-1.5 font-semibold">정답</th>
          <th className="w-8 py-1.5" aria-label="일치" />
        </tr>
      </thead>
      <tbody>
        {blanks.map((b, i) => {
          const hit = grading.blanks?.[i]
          return (
            <tr key={b.label} className="border-t border-rule align-top">
              <td className="py-2 font-semibold text-ink-2">{b.label}</td>
              <td className={cx('py-2 pr-3 font-mono', !values[i].trim() ? 'text-neutral' : hit ? 'text-ink' : 'text-error')}>{values[i].trim() || '(비움)'}</td>
              <td className="py-2 pr-3 font-semibold text-success">{b.answer}</td>
              <td className="py-2">
                {hit ? (
                  <Check className="size-4 text-success" aria-label="일치" />
                ) : (
                  <X className="size-4 text-neutral" aria-label="글자가 다름 — 직접 판단" />
                )}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
