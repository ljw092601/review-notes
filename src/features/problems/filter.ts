import type { ProblemFilter, ProblemSort } from '@/db'
import type { AttemptResult, ProblemStatus } from '@/models/types'

/** 목록 화면 필터 상태. URL 쿼리와 1:1로 대응한다. */
export interface ListFilter {
  q: string
  category: string
  status: '' | ProblemStatus
  result: '' | AttemptResult | 'none'
  tags: string[]
  sort: ProblemSort
}

export const DEFAULT_SORT: ProblemSort = 'createdDesc'

export const EMPTY_FILTER: ListFilter = { q: '', category: '', status: '', result: '', tags: [], sort: DEFAULT_SORT }

export const SORT_OPTIONS: Array<{ value: ProblemSort; label: string }> = [
  { value: 'createdDesc', label: '최근 추가' },
  { value: 'updatedDesc', label: '최근 수정' },
  { value: 'reviewedDesc', label: '최근 복습' },
  { value: 'wrongCountDesc', label: '많이 틀린 순' },
]

export const STATUS_OPTIONS: Array<{ value: ListFilter['status']; label: string }> = [
  { value: '', label: '전체' },
  { value: 'draft', label: '입력 필요' },
  { value: 'done', label: '완료' },
]

export const RESULT_OPTIONS: Array<{ value: ListFilter['result']; label: string }> = [
  { value: '', label: '복습 결과 전체' },
  { value: 'wrong', label: '틀림' },
  { value: 'partial', label: '부분' },
  { value: 'correct', label: '맞음' },
  { value: 'none', label: '아직 안 풀어봄' },
]

const SORT_SET = new Set(SORT_OPTIONS.map((o) => o.value))
const STATUS_SET = new Set(STATUS_OPTIONS.map((o) => o.value))
const RESULT_SET = new Set(RESULT_OPTIONS.map((o) => o.value))

export function parseFilter(params: URLSearchParams): ListFilter {
  const status = params.get('status') ?? ''
  const result = params.get('result') ?? ''
  const sort = params.get('sort') ?? DEFAULT_SORT
  return {
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    status: STATUS_SET.has(status as ListFilter['status']) ? (status as ListFilter['status']) : '',
    result: RESULT_SET.has(result as ListFilter['result']) ? (result as ListFilter['result']) : '',
    tags: [...new Set(params.getAll('tag').map((t) => t.trim()).filter(Boolean))],
    sort: SORT_SET.has(sort as ProblemSort) ? (sort as ProblemSort) : DEFAULT_SORT,
  }
}

/** 기본값은 생략해서 URL을 짧게 유지한다. */
export function serializeFilter(f: ListFilter): URLSearchParams {
  const params = new URLSearchParams()
  if (f.q.trim()) params.set('q', f.q.trim())
  if (f.category) params.set('category', f.category)
  if (f.status) params.set('status', f.status)
  if (f.result) params.set('result', f.result)
  for (const t of f.tags) params.append('tag', t)
  if (f.sort !== DEFAULT_SORT) params.set('sort', f.sort)
  return params
}

export function toProblemFilter(f: ListFilter): ProblemFilter {
  return {
    category: f.category || undefined,
    status: f.status || undefined,
    result: f.result || undefined,
    tags: f.tags.length ? f.tags : undefined,
    search: f.q.trim() || undefined,
    sort: f.sort,
  }
}

/** 정렬을 제외하고 걸려 있는 조건 개수 */
export function activeCount(f: ListFilter): number {
  return (f.q.trim() ? 1 : 0) + (f.category ? 1 : 0) + (f.status ? 1 : 0) + (f.result ? 1 : 0) + f.tags.length
}
