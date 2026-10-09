import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Segmented, Select } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { Category } from '@/models/types'
import { RESULT_OPTIONS, SORT_OPTIONS, STATUS_OPTIONS, activeCount, type ListFilter } from './filter'

const TAG_LIMIT = 12
const DEBOUNCE_MS = 200

export function FilterBar({
  filter,
  categories,
  tags,
  onChange,
  onToggleTag,
  onReset,
}: {
  filter: ListFilter
  categories: Category[]
  tags: Array<{ tag: string; count: number }>
  onChange: (patch: Partial<ListFilter>) => void
  onToggleTag: (tag: string) => void
  onReset: () => void
}) {
  const searchId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const focusOnMount = (location.state as { focusSearch?: boolean } | null)?.focusSearch === true
  const [text, setText] = useState(filter.q)
  const [showAllTags, setShowAllTags] = useState(false)
  const active = activeCount(filter)

  // 입력을 잠깐 모았다가 URL에 반영
  useEffect(() => {
    if (text === filter.q) return
    const t = setTimeout(() => onChange({ q: text }), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [text, filter.q, onChange])

  // "/" 단축키(Layout)가 보내는 이벤트와, 다른 화면에서 "/"로 넘어온 경우
  useEffect(() => {
    const focus = () => searchRef.current?.focus()
    if (focusOnMount) focus()
    window.addEventListener('reviewnotes:focus-search', focus)
    return () => window.removeEventListener('reviewnotes:focus-search', focus)
  }, [focusOnMount])

  function reset() {
    setText('')
    setShowAllTags(false)
    onReset()
  }

  const selected = new Set(filter.tags)
  const visibleTags = showAllTags ? tags : tags.filter((t, i) => i < TAG_LIMIT || selected.has(t.tag))
  const hiddenCount = tags.length - visibleTags.length

  return (
    <section aria-label="필터" className="rounded-card border border-rule bg-paper-2/60 p-3 sm:p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral" aria-hidden />
        <label htmlFor={searchId} className="sr-only">
          검색
        </label>
        <input
          ref={searchRef}
          id={searchId}
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="문제, 정답, 풀이, 출처에서 찾기 ( / )"
          autoComplete="off"
          className="h-11 w-full rounded-control border border-rule-2 bg-paper pr-10 pl-10 text-[0.95rem] text-ink placeholder:text-neutral transition-[background-color] duration-(--dur-micro) hover:bg-paper-2 focus-visible:outline-offset-1 [&::-webkit-search-cancel-button]:hidden"
        />
        {text && (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => {
              setText('')
              searchRef.current?.focus()
            }}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-pill text-neutral hover:bg-paper-3 hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 grow basis-44 sm:grow-0">
          <label className="sr-only" htmlFor={`${searchId}-category`}>
            문제 유형
          </label>
          <Select id={`${searchId}-category`} value={filter.category} onChange={(e) => onChange({ category: e.target.value })} className="h-10!">
            <option value="">모든 유형</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Segmented label="입력 상태" value={filter.status} onChange={(status) => onChange({ status })} options={STATUS_OPTIONS} />

        <div className="min-w-0 grow basis-40 sm:grow-0">
          <label className="sr-only" htmlFor={`${searchId}-result`}>
            복습 결과
          </label>
          <Select
            id={`${searchId}-result`}
            value={filter.result}
            onChange={(e) => onChange({ result: e.target.value as ListFilter['result'] })}
            className="h-10!"
          >
            {RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor={`${searchId}-sort`}>
            정렬
          </label>
          <div className="relative">
            <SlidersHorizontal className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-neutral" aria-hidden />
            <Select
              id={`${searchId}-sort`}
              value={filter.sort}
              onChange={(e) => onChange({ sort: e.target.value as ListFilter['sort'] })}
              className="h-10! pl-8!"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          {active > 0 && (
            <Button size="sm" variant="ghost" onClick={reset} icon={<X className="size-3.5" aria-hidden />}>
              초기화
              <span className="rounded-pill bg-accent-soft px-1.5 text-[0.7rem] font-semibold text-accent-deep tabular-nums">{active}</span>
            </Button>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="태그">
          {visibleTags.map(({ tag, count }) => {
            const on = selected.has(tag)
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleTag(tag)}
                className={cx(
                  'inline-flex h-7 items-center gap-1 rounded-pill border px-2.5 text-xs transition-[background-color,border-color,color] duration-(--dur-micro)',
                  on ? 'border-accent bg-accent-soft font-medium text-accent-deep' : 'border-rule text-muted hover:border-rule-2 hover:bg-paper-2 hover:text-ink',
                )}
              >
                #{tag}
                <span className={cx('tabular-nums', on ? 'text-accent-deep/70' : 'text-neutral')}>{count}</span>
              </button>
            )
          })}
          {hiddenCount > 0 && (
            <button type="button" onClick={() => setShowAllTags(true)} className="h-7 rounded-pill px-2 text-xs text-neutral hover:bg-paper-2 hover:text-ink">
              +{hiddenCount}개 더
            </button>
          )}
          {showAllTags && tags.length > TAG_LIMIT && (
            <button type="button" onClick={() => setShowAllTags(false)} className="h-7 rounded-pill px-2 text-xs text-neutral hover:bg-paper-2 hover:text-ink">
              접기
            </button>
          )}
        </div>
      )}
    </section>
  )
}
