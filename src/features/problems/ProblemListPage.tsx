import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, useCategories, useProblems } from '@/db'
import { Button, EmptyState } from '@/components/ui'
import type { Attempt } from '@/models/types'
import { ProblemCard } from './ProblemCard'

/** 문제별 최근 시도 하나씩 */
function useLatestAttempts(problemIds: string[] | undefined) {
  return useLiveQuery(async () => {
    if (!problemIds?.length) return new Map<string, Attempt>()
    const attempts = await db.attempts.where('problemId').anyOf(problemIds).toArray()
    const latest = new Map<string, Attempt>()
    for (const a of attempts) {
      const prev = latest.get(a.problemId)
      if (!prev || a.attemptedAt > prev.attemptedAt) latest.set(a.problemId, a)
    }
    return latest
  }, [problemIds?.join(',')])
}

export function ProblemListPage() {
  const navigate = useNavigate()
  const problems = useProblems()
  const categories = useCategories()
  const ids = useMemo(() => problems?.map((p) => p.id), [problems])
  const latest = useLatestAttempts(ids)
  const categoryMap = useMemo(() => new Map(categories?.map((c) => [c.id, c])), [categories])

  if (!problems) return null

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">문제</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="tabular-nums">{problems.length}</span>개
          </p>
        </div>
      </div>

      {problems.length === 0 ? (
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
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {problems.map((p) => (
            <ProblemCard key={p.id} problem={p} category={categoryMap.get(p.category)} latestAttempt={latest?.get(p.id)} />
          ))}
        </ul>
      )}
    </div>
  )
}
