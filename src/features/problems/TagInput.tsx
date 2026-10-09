import { X } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui'
import { cx } from '@/lib/cx'

export function TagInput({
  value,
  onChange,
  suggestions = [],
  id,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  id?: string
}) {
  const [draft, setDraft] = useState('')
  const listId = useId()

  const matches = useMemo(() => {
    const q = draft.trim().toLowerCase()
    return suggestions.filter((s) => !value.includes(s) && (!q || s.toLowerCase().includes(q))).slice(0, 8)
  }, [draft, suggestions, value])

  function add(tag: string) {
    const t = tag.trim().replace(/^#/, '')
    if (!t) return
    if (!value.includes(t)) onChange([...value, t])
    setDraft('')
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(draft)
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="선택한 태그">
          {value.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 rounded-pill bg-paper-2 py-0.5 pr-1 pl-2.5 text-sm text-ink-2">
              #{t}
              <button
                type="button"
                aria-label={`${t} 태그 제거`}
                onClick={() => onChange(value.filter((v) => v !== t))}
                className="flex size-5 items-center justify-center rounded-pill hover:bg-paper-3"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
        placeholder="UML, 서브넷"
        aria-describedby={listId}
        autoComplete="off"
      />
      <div id={listId} className={cx('mt-1.5 flex flex-wrap gap-1', matches.length === 0 && 'hidden')}>
        {matches.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="rounded-pill border border-rule px-2 py-0.5 text-xs text-muted hover:bg-paper-2"
          >
            #{s}
          </button>
        ))}
      </div>
    </div>
  )
}
