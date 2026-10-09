import { Eye, PencilLine } from 'lucide-react'
import { useId, useMemo, useState, type ReactNode } from 'react'
import { ANSWER_TYPE_LABEL } from '@/lib/labels'
import type { GalleryImage } from '@/components/ImageGallery'
import { Markdown } from '@/components/Markdown'
import { Button, Card, Field, Input, SectionTitle, Segmented, Select, Textarea } from '@/components/ui'
import { cx } from '@/lib/cx'
import type { Category } from '@/models/types'
import { ImageAttach } from './ImageAttach'
import { TagInput } from './TagInput'
import { deriveStatus, type FieldErrors, type FormValues } from './form'

function MarkdownField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows,
  required,
  error,
  helper,
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

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="px-5 py-5 sm:px-6">
      <SectionTitle className="mb-4">{title}</SectionTitle>
      <div className="space-y-2">{children}</div>
    </Card>
  )
}

export function ProblemForm({
  values,
  onChange,
  errors,
  categories,
  tagSuggestions,
  images,
  onAddImages,
  onRemoveImage,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  values: FormValues
  onChange: (next: FormValues) => void
  errors: FieldErrors
  categories: Category[]
  tagSuggestions: string[]
  images: GalleryImage[]
  onAddImages: (files: Array<{ name: string; blob: Blob }>) => void
  onRemoveImage: (id: string) => void
  onSubmit: () => void
  onCancel: () => void
  saving: boolean
  submitLabel: string
}) {
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`
  const set = <K extends keyof FormValues>(key: K) => (value: FormValues[K]) => onChange({ ...values, [key]: value })
  const status = useMemo(() => deriveStatus(values), [values])

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      noValidate
    >
      <Group title="분류">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="문제 유형" htmlFor={id('category')} required error={errors.category}>
            <Select id={id('category')} value={values.category} onChange={(e) => set('category')(e.target.value)} aria-invalid={errors.category ? true : undefined}>
              <option value="" disabled>
                유형 선택
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="출처" htmlFor={id('source')} helper="예: 2024년 2회 기출 3번" error={errors.source}>
            <Input id={id('source')} value={values.source} onChange={(e) => set('source')(e.target.value)} placeholder="2024년 2회 기출 3번" />
          </Field>
          <Field label="자격증" htmlFor={id('cert')} required error={errors.certification}>
            <Input id={id('cert')} value={values.certification} onChange={(e) => set('certification')(e.target.value)} />
          </Field>
          <Field label="답 형식" htmlFor={id('type')}>
            <div className="flex h-11 items-center">
              <Segmented
                label="답 형식"
                value={values.answerType}
                onChange={set('answerType')}
                options={(['short', 'essay', 'choice'] as const).map((v) => ({ value: v, label: ANSWER_TYPE_LABEL[v] }))}
              />
            </div>
          </Field>
        </div>
        <Field label="태그" htmlFor={id('tags')} helper="Enter 또는 쉼표로 추가">
          <TagInput id={id('tags')} value={values.tags} onChange={set('tags')} suggestions={tagSuggestions} />
        </Field>
      </Group>

      <Group title="문제">
        <MarkdownField
          id={id('question')}
          label="문제"
          required
          value={values.question}
          onChange={set('question')}
          error={errors.question}
          helper="마크다운 사용 가능. 코드는 ``` 로 감싸요"
          placeholder="문제 본문"
          rows={6}
        />
        {values.answerType === 'choice' && (
          <Field label="보기" htmlFor={id('choices')} helper="한 줄에 하나씩">
            <Textarea id={id('choices')} value={values.choicesText} onChange={(e) => set('choicesText')(e.target.value)} rows={4} placeholder={'보기 1\n보기 2'} />
          </Field>
        )}
        <Field label="사진" htmlFor={id('images')}>
          <ImageAttach images={images} onAdd={onAddImages} onRemove={onRemoveImage} />
        </Field>
      </Group>

      <Group title="답">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <MarkdownField id={id('my')} label="내 답" value={values.myAnswer} onChange={set('myAnswer')} rows={3} placeholder="시험에서 썼던 답" />
          <MarkdownField id={id('correct')} label="정답" value={values.correctAnswer} onChange={set('correctAnswer')} rows={3} placeholder="정답" error={errors.correctAnswer} />
        </div>
      </Group>

      <Group title="되짚기">
        <MarkdownField id={id('wrong')} label="틀린 이유" value={values.wrongReason} onChange={set('wrongReason')} rows={4} placeholder="개념을 헷갈렸는지, 문제를 잘못 읽었는지" />
        <MarkdownField id={id('expl')} label="풀이" value={values.explanation} onChange={set('explanation')} rows={6} placeholder="다음에 보면 바로 이해되게" />
        <p className={cx('text-xs', status === 'done' ? 'text-success' : 'text-warn')}>
          {status === 'done' ? '풀이와 틀린 이유가 모두 있어서 완료로 저장돼요.' : '풀이와 틀린 이유를 둘 다 적으면 완료로 바뀌어요. 지금은 "입력 필요"로 저장돼요.'}
        </p>
      </Group>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-rule bg-paper/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
