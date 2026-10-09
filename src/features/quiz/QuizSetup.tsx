import { useLiveQuery } from 'dexie-react-hooks'
import { Play } from 'lucide-react'
import { useId, useMemo } from 'react'
import { Button, Card, EmptyState, Segmented, Select } from '@/components/ui'
import { latestAttempts, queryProblems, useCategories, useTags } from '@/db'
import { cx } from '@/lib/cx'
import type { Attempt, Problem } from '@/models/types'
import { LIMIT_OPTIONS, ORDER_OPTIONS, SCOPE_OPTIONS, filterCandidates, type QuizSetup as Setup } from './session'

/** 범위에 맞는 후보 문제와 최근 시도. undefined면 로딩 중 */
function useCandidates(setup: Setup): { candidates: Problem[]; latest: Map<string, Attempt> } | undefined {
  return useLiveQuery(async () => {
    const problems = await queryProblems({
      category: setup.category || undefined,
      tags: setup.tags.length ? setup.tags : undefined,
    })
    const latest = await latestAttempts(problems.map((p) => p.id))
    return { candidates: filterCandidates(problems, latest, setup), latest }
  }, [setup.category, setup.tags.join('\u0000'), setup.scope])
}

export function QuizSetup({
  setup,
  onChange,
  onStart,
}: {
  setup: Setup
  onChange: (patch: Partial<Setup>) => void
  onStart: (candidates: Problem[], latest: Map<string, Attempt>) => void
}) {
  const uid = useId()
  const categories = useCategories()
  const tags = useTags()
  const data = useCandidates(setup)
  const count = data?.candidates.length ?? 0
  const selected = useMemo(() => new Set(setup.tags), [setup.tags])
  const willAsk = setup.limit > 0 ? Math.min(setup.limit, count) : count

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">복습</h1>
      <p className="mt-1 text-sm text-muted">범위를 고르고 문제만 보고 답을 써 본 뒤, 정답과 풀이를 보고 직접 채점해요.</p>

      <Card className="mt-5 p-5 sm:p-6">
        <fieldset>
          <legend className="text-sm font-semibold text-ink-2">어떤 문제를 풀까요?</legend>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="복습 범위">
            {SCOPE_OPTIONS.map((o) => {
              const active = setup.scope === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ scope: o.value })}
                  className={cx(
                    'rounded-control border px-3.5 py-3 text-left transition-[background-color,border-color] duration-(--dur-micro)',
                    active ? 'border-accent bg-accent-soft' : 'border-rule-2 bg-paper hover:bg-paper-2',
                  )}
                >
                  <span className={cx('block text-sm font-medium', active ? 'text-accent-deep' : 'text-ink')}>{o.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{o.description}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-0 grow basis-44 sm:grow-0">
            <label htmlFor={`${uid}-category`} className="mb-1.5 block text-sm font-medium text-ink-2">
              문제 유형
            </label>
            <Select id={`${uid}-category`} value={setup.category} onChange={(e) => onChange({ category: e.target.value })}>
              <option value="">모든 유형</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-2">문제 수</p>
            <Segmented label="문제 수" value={String(setup.limit)} onChange={(v) => onChange({ limit: Number(v) })} options={LIMIT_OPTIONS.map((o) => ({ value: String(o.value), label: o.label }))} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink-2">순서</p>
            <Segmented label="순서" value={setup.order} onChange={(order) => onChange({ order })} options={ORDER_OPTIONS} />
          </div>
        </div>

        {tags && tags.length > 0 && (
          <div className="mt-5">
            <p className="mb-1.5 text-sm font-medium text-ink-2">태그</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="태그">
              {tags.map(({ tag, count: n }) => {
                const on = selected.has(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ tags: on ? setup.tags.filter((t) => t !== tag) : [...setup.tags, tag] })}
                    className={cx(
                      'inline-flex h-7 items-center gap-1 rounded-pill border px-2.5 text-xs transition-[background-color,border-color,color] duration-(--dur-micro)',
                      on ? 'border-accent bg-accent-soft font-medium text-accent-deep' : 'border-rule text-muted hover:border-rule-2 hover:bg-paper-2 hover:text-ink',
                    )}
                  >
                    #{tag}
                    <span className={cx('tabular-nums', on ? 'text-accent-deep/70' : 'text-neutral')}>{n}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
          <p className="text-sm text-muted" aria-live="polite">
            {data === undefined ? (
              '세는 중…'
            ) : count === 0 ? (
              '조건에 맞는 문제가 없어요'
            ) : (
              <>
                조건에 맞는 문제 <span className="font-medium text-ink tabular-nums">{count}</span>개 중{' '}
                <span className="font-medium text-ink tabular-nums">{willAsk}</span>개를 풀어요
              </>
            )}
          </p>
          <Button
            variant="primary"
            icon={<Play className="size-4" aria-hidden />}
            disabled={!data || count === 0}
            onClick={() => data && onStart(data.candidates, data.latest)}
          >
            복습 시작
          </Button>
        </div>
      </Card>

      {data !== undefined && count === 0 && (
        <div className="mt-4">
          <EmptyState title="풀 문제가 없어요" body="정답이 비어 있는 문제는 퀴즈로 나오지 않아요. 범위를 넓히거나 문제를 더 기록해 보세요." />
        </div>
      )}
    </div>
  )
}
