import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, useCategories, useLatestAttempts, useProblems, useTags } from '@/db'
import { Button, EmptyState } from '@/components/ui'
import { ProblemCard } from './ProblemCard'
import { FilterBar } from './FilterBar'
import { activeCount, toProblemFilter } from './filter'
import { useListFilter } from './useListFilter'

export function ProblemListPage() {
  const navigate = useNavigate()
  const { filter, update, toggleTag, reset } = useListFilter()
  const query = useMemo(() => toProblemFilter(filter), [filter])
  const problems = useProblems(query)
  const total = useLiveQuery(() => db.problems.count(), [])
  const categories = useCategories()
  const tags = useTags()
  const ids = useMemo(() => problems?.map((p) => p.id), [problems])
  const latest = useLatestAttempts(ids)
  const categoryMap = useMemo(() => new Map(categories?.map((c) => [c.id, c])), [categories])
  const filtered = activeCount(filter) > 0

  if (!problems || total === undefined) return null

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">문제</h1>
          <p className="mt-1 text-sm text-muted">
            {filtered ? (
              <>
                <span className="tabular-nums">{total}</span>개 중 <span className="font-medium text-ink tabular-nums">{problems.length}</span>개
              </>
            ) : (
              <>
                <span className="tabular-nums">{total}</span>개
              </>
            )}
          </p>
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="아직 기록한 문제가 없어요"
            body="틀린 문제를 직접 입력하거나, 사진을 inbox 폴더에 넣고 Claude에게 정리를 맡긴 뒤 가져오기에서 불러올 수 있어요."
            action={
              <Button variant="primary" icon={<Plus className="size-4" aria-hidden />} onClick={() => navigate('/problems/new')}>
                첫 문제 기록하기
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-5">
            <FilterBar filter={filter} categories={categories ?? []} tags={tags ?? []} onChange={update} onToggleTag={toggleTag} onReset={reset} />
          </div>
          {problems.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="조건에 맞는 문제가 없어요"
                body="검색어나 필터를 바꿔 보세요."
                action={
                  <Button variant="secondary" onClick={reset}>
                    필터 초기화
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {problems.map((p) => (
                <ProblemCard key={p.id} problem={p} category={categoryMap.get(p.category)} latestAttempt={latest?.get(p.id)} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
