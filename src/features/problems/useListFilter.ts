import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EMPTY_FILTER, parseFilter, serializeFilter, type ListFilter } from './filter'

/** URL 쿼리(?q=&category=&tag=…)로 관리하는 목록 필터. 상세에서 돌아와도 유지된다. */
export function useListFilter() {
  const [params, setParams] = useSearchParams()
  const filter = useMemo(() => parseFilter(params), [params])

  const update = useCallback(
    (patch: Partial<ListFilter>) => {
      setParams((prev) => serializeFilter({ ...parseFilter(prev), ...patch }), { replace: true })
    },
    [setParams],
  )

  const toggleTag = useCallback(
    (tag: string) => {
      setParams(
        (prev) => {
          const cur = parseFilter(prev)
          const tags = cur.tags.includes(tag) ? cur.tags.filter((t) => t !== tag) : [...cur.tags, tag]
          return serializeFilter({ ...cur, tags })
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => setParams(serializeFilter(EMPTY_FILTER), { replace: true }), [setParams])

  return { filter, update, toggleTag, reset }
}
