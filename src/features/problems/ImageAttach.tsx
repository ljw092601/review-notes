import { ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ImageGallery, type GalleryImage } from '@/components/ImageGallery'
import { cx } from '@/lib/cx'
import { isImageFile, normalizeImage } from '@/lib/image'

export function ImageAttach({
  images,
  onAdd,
  onRemove,
}: {
  images: GalleryImage[]
  onAdd: (files: Array<{ name: string; blob: Blob }>) => void
  onRemove: (id: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onAddRef = useRef(onAdd)
  useEffect(() => {
    onAddRef.current = onAdd
  }, [onAdd])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  async function accept(files: FileList | File[]) {
    const list = Array.from(files).filter(isImageFile)
    if (list.length === 0) return
    setBusy(true)
    try {
      const prepared = await Promise.all(list.map(async (f) => ({ name: f.name || 'image', blob: await normalizeImage(f) })))
      onAddRef.current(prepared)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []).filter(isImageFile)
      if (files.length === 0) return
      e.preventDefault()
      const prepared = await Promise.all(files.map(async (f) => ({ name: f.name || 'pasted', blob: await normalizeImage(f) })))
      onAddRef.current(prepared)
    }
    const handler = (e: ClipboardEvent) => void onPaste(e)
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void accept(e.dataTransfer.files)
  }

  return (
    <div>
      <ImageGallery images={images} onRemove={onRemove} className="mb-3" />
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cx(
          'flex flex-col items-center justify-center gap-1 rounded-control border border-dashed px-4 py-6 text-center transition-[background-color,border-color] duration-(--dur-micro)',
          dragging ? 'border-accent bg-accent-soft' : 'border-rule-2 bg-paper',
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-busy={busy || undefined}
          className="inline-flex h-10 items-center gap-1.5 rounded-control px-3 text-sm font-medium text-ink-2 hover:bg-paper-2 disabled:opacity-55"
        >
          <ImagePlus className="size-4" aria-hidden />
          {busy ? '이미지 준비 중' : '사진 추가'}
        </button>
        <p className="text-xs text-neutral">끌어다 놓거나 붙여넣기(Ctrl+V)도 돼요. 긴 변 1600px로 줄여서 저장해요.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) void accept(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}
