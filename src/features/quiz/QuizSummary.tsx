import { RotateCcw, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ResultBadge } from '@/components/badges'
import { Badge, Button, Card } from '@/components/ui'
import { excerpt } from '@/lib/text'
import { tally, type QuizState } from './session'

export function QuizSummary({ state, onRetryWrong, onReset }: { state: QuizState; onRetryWrong: () => void; onReset: () => void }) {
  const t = tally(state)
  const graded = t.correct + t.partial + t.wrong
  const retry = state.problems.filter((p) => state.answers[p.id]?.result !== 'correct').length
  const rate = graded ? Math.round((t.correct / graded) * 100) : 0

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">복습 결과</h1>
      <p className="mt-1 text-sm text-muted">
        {graded === 0 ? (
          '채점한 문제가 없어요.'
        ) : (
          <>
            <span className="tabular-nums">{graded}</span>개 채점 · 정답률 <span className="font-medium text-ink tabular-nums">{rate}%</span>
          </>
        )}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {(
          [
            ['맞음', t.correct, 'text-success bg-success-soft'],
            ['부분', t.partial, 'text-warn bg-warn-soft'],
            ['틀림', t.wrong, 'text-error bg-error-soft'],
          ] as const
        ).map(([label, n, cls]) => (
          <div key={label} className={`rounded-card px-4 py-4 text-center ${cls}`}>
            <p className="text-2xl font-bold tabular-nums">{n}</p>
            <p className="mt-0.5 text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      <Card className="mt-5 divide-y divide-rule">
        {state.problems.map((p, i) => {
          const r = state.answers[p.id]?.result
          return (
            <Link key={p.id} to={`/problems/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper-2 sm:px-5">
              <span className="w-5 shrink-0 text-right text-xs text-neutral tabular-nums">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{excerpt(p.question, 90)}</span>
              {r ? <ResultBadge result={r} /> : <Badge>안 풂</Badge>}
            </Link>
          )
        })}
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        {retry > 0 && (
          <Button variant="primary" icon={<RotateCcw className="size-4" aria-hidden />} onClick={onRetryWrong}>
            틀린 것만 다시 ({retry})
          </Button>
        )}
        <Button icon={<Settings2 className="size-4" aria-hidden />} onClick={onReset}>
          범위 다시 고르기
        </Button>
        <Link to="/" className="inline-flex h-11 items-center rounded-control px-4 text-[0.925rem] font-medium text-ink-2 hover:bg-paper-2">
          문제 목록으로
        </Link>
      </div>
    </div>
  )
}
