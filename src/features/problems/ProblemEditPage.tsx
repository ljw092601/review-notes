import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { GalleryImage } from '@/components/ImageGallery'
import { useToast } from '@/components/toast-context'
import { Button, EmptyState } from '@/components/ui'
import { addImage, createProblem, deleteImage, newId, updateProblem, useCategories, useImages, useProblem, useTags } from '@/db'
import type { Category, ImageRecord, Problem } from '@/models/types'
import { ProblemForm } from './ProblemForm'
import { toFormValues, toProblemInput, validate, type FieldErrors, type FormValues } from './form'

interface PendingImage extends GalleryImage {
  pending: true
}

function ProblemEditor({
  problem,
  existingImages,
  categories,
}: {
  problem?: Problem
  existingImages: ImageRecord[]
  categories: Category[]
}) {
  const isNew = !problem
  const navigate = useNavigate()
  const toast = useToast()
  const tags = useTags()

  const [values, setValues] = useState<FormValues>(() => toFormValues(problem, categories[0]?.id ?? ''))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pending, setPending] = useState<PendingImage[]>([])
  const [removed, setRemoved] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const images = useMemo<GalleryImage[]>(
    () => [...existingImages.filter((img) => !removed.has(img.id)), ...pending],
    [existingImages, removed, pending],
  )

  async function save() {
    const fieldErrors = validate(values)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return
    setSaving(true)
    try {
      const input = toProblemInput(values, problem)
      const saved = problem ? await updateProblem(problem.id, input) : await createProblem(input)
      await Promise.all([
        ...pending.map((img) => addImage(saved.id, img.blob, img.name, img.id)),
        ...[...removed].map((imageId) => deleteImage(imageId)),
      ])
      navigate(`/problems/${saved.id}`, { replace: true })
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '저장하지 못했어요', { tone: 'error' })
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">{isNew ? '새 문제' : '문제 편집'}</h1>
      <div className="mt-5">
        <ProblemForm
          values={values}
          onChange={setValues}
          errors={errors}
          categories={categories}
          tagSuggestions={tags?.map((t) => t.tag) ?? []}
          images={images}
          onAddImages={(files) =>
            setPending((list) => [...list, ...files.map((f) => ({ ...f, id: newId(), pending: true as const }))])
          }
          onRemoveImage={(imageId) => {
            if (pending.some((p) => p.id === imageId)) setPending((list) => list.filter((p) => p.id !== imageId))
            else setRemoved((set) => new Set(set).add(imageId))
          }}
          onSubmit={() => void save()}
          onCancel={() => navigate(isNew ? '/' : `/problems/${problem.id}`)}
          saving={saving}
          submitLabel={isNew ? '기록하기' : '저장'}
        />
      </div>
    </div>
  )
}

export function ProblemEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const problem = useProblem(id)
  const existingImages = useImages(id)
  const categories = useCategories()

  if (id && problem === null) {
    return <EmptyState title="문제를 찾을 수 없어요" action={<Button onClick={() => navigate('/')}>목록으로</Button>} />
  }
  if (!categories || (id && (!problem || !existingImages))) return null

  // key로 문제가 바뀌면 폼 상태를 새로 만든다
  return <ProblemEditor key={id ?? 'new'} problem={problem ?? undefined} existingImages={existingImages ?? []} categories={categories} />
}
