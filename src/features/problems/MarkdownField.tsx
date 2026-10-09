import { Eye, PencilLine } from 'lucide-react'
import { useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { Field, Textarea } from '@/components/ui'

/** 마크다운 입력란. 오른쪽 위 눈 아이콘으로 미리보기와 편집을 오간다. */
export function MarkdownField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows,
  required,
  error,
  helper,
  autoFocus,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
  error?: string
  helper?: string
  autoFocus?: boolean
}) {
  const [preview, setPreview] = useState(false)
  return (
    <Field label={label} htmlFor={id} required={required} error={error} helper={helper}>
      <div className="relative">
        {preview ? (
          <div className="min-h-28 rounded-control border border-rule bg-paper-2 px-3.5 py-2.5">
            {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-sm text-neutral">미리볼 내용이 없어요</p>}
          </div>
        ) : (
          <Textarea
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            autoFocus={autoFocus}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            className="pr-12"
          />
        )}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          aria-pressed={preview}
          aria-label={preview ? '편집으로 돌아가기' : '마크다운 미리보기'}
          title={preview ? '편집' : '미리보기'}
          className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-[6px] text-neutral hover:bg-paper-3 hover:text-ink"
        >
          {preview ? <PencilLine className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </Field>
  )
}
