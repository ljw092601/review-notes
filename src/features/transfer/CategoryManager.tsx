import { ChevronDown, ChevronUp, PencilLine, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Card, Field, Input, SectionTitle } from '@/components/ui'
import { useToast } from '@/components/toast-context'
import { addCategory, db, deleteCategory, renameCategory, reorderCategories, useCategories } from '@/db'
import { FALLBACK_CATEGORY_ID } from '@/models/categories'
import type { Category } from '@/models/types'

function useCategoryCounts() {
  return useLiveQuery(async () => {
    const counts = new Map<string, number>()
    await db.problems.each((p) => counts.set(p.category, (counts.get(p.category) ?? 0) + 1))
    return counts
  }, [])
}

export function CategoryManager() {
  const toast = useToast()
  const categories = useCategories()
  const counts = useCategoryCounts()

  async function move(index: number, delta: -1 | 1) {
    if (!categories) return
    const next = [...categories]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await reorderCategories(next.map((c) => c.id))
  }

  async function remove(category: Category) {
    const moved = counts?.get(category.id) ?? 0
    try {
      await deleteCategory(category.id)
      toast.show(moved > 0 ? `‘${category.name}’ 유형을 지우고 문제 ${moved}개를 ‘기타’로 옮겼어요` : `‘${category.name}’ 유형을 지웠어요`)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '유형을 지우지 못했어요', { tone: 'error' })
    }
  }

  return (
    <Card as="section" className="p-5 sm:p-6">
      <SectionTitle>문제 유형 관리</SectionTitle>
      <p className="mt-1.5 text-sm text-muted">유형을 지우면 그 유형의 문제는 ‘기타’로 옮겨져요. 되돌릴 수 없으니 신중하게.</p>

      {categories && (
        <ul className="mt-4 divide-y divide-rule rounded-control border border-rule" aria-label="문제 유형 목록">
          {categories.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              count={counts?.get(c.id) ?? 0}
              isFirst={i === 0}
              isLast={i === categories.length - 1}
              onUp={() => void move(i, -1)}
              onDown={() => void move(i, 1)}
              onDelete={() => void remove(c)}
            />
          ))}
        </ul>
      )}

      <AddCategoryForm />
    </Card>
  )
}

function CategoryRow({
  category,
  count,
  isFirst,
  isLast,
  onUp,
  onDown,
  onDelete,
}: {
  category: Category
  count: number
  isFirst: boolean
  isLast: boolean
  onUp: () => void
  onDown: () => void
  onDelete: () => void
}) {
  const toast = useToast()
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description)
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const isFallback = category.id === FALLBACK_CATEGORY_ID

  function startEdit() {
    setName(category.name)
    setDescription(category.description)
    setError(undefined)
    setEditing(true)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('유형 이름을 입력하세요')
      return
    }
    setSaving(true)
    try {
      await renameCategory(category.id, name, description)
      setEditing(false)
      toast.show('유형을 바꿨어요')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <li className="px-3.5 py-3">
        <form onSubmit={(e) => void save(e)} noValidate className="flex flex-col gap-2">
          <Field label="이름" htmlFor={`${id}-name`} error={error} required>
            <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={error ? true : undefined} autoFocus />
          </Field>
          <Field label="설명" htmlFor={`${id}-desc`} className="-mt-2">
            <Input id={`${id}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="어떤 문제가 들어가는지" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="sm" loading={saving}>
              저장
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
              취소
            </Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">
          {category.name}
          <span className="ml-2 text-xs font-normal text-neutral tabular-nums">문제 {count}개</span>
        </p>
        {category.description && <p className="mt-0.5 truncate text-xs text-muted">{category.description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label={`${category.name} 위로`} onClick={onUp} disabled={isFirst}>
          <ChevronUp className="size-4" aria-hidden />
        </IconButton>
        <IconButton label={`${category.name} 아래로`} onClick={onDown} disabled={isLast}>
          <ChevronDown className="size-4" aria-hidden />
        </IconButton>
        <IconButton label={`${category.name} 이름 바꾸기`} onClick={startEdit}>
          <PencilLine className="size-4" aria-hidden />
        </IconButton>
        <IconButton
          label={isFallback ? '기타 유형은 지울 수 없어요' : `${category.name} 지우기 (문제는 ‘기타’로 옮겨져요)`}
          onClick={onDelete}
          disabled={isFallback}
          danger
        >
          <Trash2 className="size-4" aria-hidden />
        </IconButton>
      </div>
    </li>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        danger
          ? 'flex size-9 items-center justify-center rounded-control text-ink-2 transition-[background-color,color] duration-(--dur-micro) hover:bg-error-soft hover:text-error disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-2'
          : 'flex size-9 items-center justify-center rounded-control text-ink-2 transition-[background-color] duration-(--dur-micro) hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
      }
    >
      {children}
    </button>
  )
}

function AddCategoryForm() {
  const toast = useToast()
  const id = useId()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('유형 이름을 입력하세요')
      return
    }
    setSaving(true)
    try {
      const created = await addCategory(name, description.trim())
      setName('')
      setDescription('')
      setError(undefined)
      toast.show(`‘${created.name}’ 유형을 추가했어요`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가하지 못했어요')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="mt-4 flex flex-wrap items-start gap-x-3 gap-y-0">
      <Field label="새 유형 이름" htmlFor={`${id}-name`} error={error} required className="min-w-0 grow basis-48">
        <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 클라우드" aria-invalid={error ? true : undefined} />
      </Field>
      <Field label="설명" htmlFor={`${id}-desc`} className="min-w-0 grow-[2] basis-64">
        <Input id={`${id}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="어떤 문제가 들어가는지 (선택)" />
      </Field>
      <div className="pt-[1.6rem]">
        <Button type="submit" variant="secondary" loading={saving} icon={<Plus className="size-4" aria-hidden />}>
          추가
        </Button>
      </div>
    </form>
  )
}
