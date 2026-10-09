import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { listCategories } from './categories'
import { latestAttempts, listAttempts, listImages, listTags, queryProblems, type ProblemFilter } from './problems'

/** 반환값이 undefined면 아직 로딩 중 */
export function useProblems(filter: ProblemFilter = {}) {
  return useLiveQuery(
    () => queryProblems(filter),
    [filter.category, filter.status, filter.search, filter.sort, filter.result, filter.tags?.join('\u0000')],
  )
}

/** undefined = 로딩 중, null = 없음 */
export function useProblem(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.problems.get(id)) ?? null) : null), [id])
}

/** 문제별 최근 시도 하나씩 */
export function useLatestAttempts(problemIds: string[] | undefined) {
  return useLiveQuery(() => latestAttempts(problemIds ?? []), [problemIds?.join('\u0000')])
}

export function useCategories() {
  return useLiveQuery(listCategories, [])
}

export function useImages(problemId: string | undefined) {
  return useLiveQuery(() => (problemId ? listImages(problemId) : []), [problemId])
}

export function useAttempts(problemId: string | undefined) {
  return useLiveQuery(() => (problemId ? listAttempts(problemId) : []), [problemId])
}

export function useTags() {
  return useLiveQuery(listTags, [])
}

export function useDraftCount() {
  return useLiveQuery(() => db.problems.where('status').equals('draft').count(), [])
}
