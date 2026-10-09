import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useObjectUrl } from '@/lib/useObjectUrl'
import { cx } from '@/lib/cx'


export interface GalleryImage {
  id: string
  name: string
  blob: Blob
}

function Thumb({ image, onOpen, onRemove }: { image: GalleryImage; onOpen: () => void; onRemove?: () => void }) {
  const url = useObjectUrl(image.blob)
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onOpen}
        className="block overflow-hidden rounded-control border border-rule bg-paper-2 transition-transform duration-(--dur-short) ease-(--ease-out) hover:-translate-y-0.5"
        aria-label={`${image.name} 크게 보기`}
      >
        {url ? (
          <img src={url} alt={image.name} className="h-28 w-28 object-cover sm:h-32 sm:w-32" loading="lazy" />
        ) : (
          <div className="h-28 w-28 sm:h-32 sm:w-32" />
        )}
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`${image.name} 제거`}
          className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-pill border border-rule-2 bg-paper text-ink-2 shadow-card hover:bg-error-soft hover:text-error"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

function Lightbox({ image, onClose }: { image: GalleryImage; onClose: () => void }) {
  const url = useObjectUrl(image.blob)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={image.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      onClick={onClose}
    >
      {url && (
        <img src={url} alt={image.name} className="max-h-full max-w-full rounded-control shadow-lift" onClick={(e) => e.stopPropagation()} />
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-pill bg-paper text-ink shadow-lift"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  )
}

export function ImageGallery({
  images,
  onRemove,
  className,
}: {
  images: GalleryImage[]
  onRemove?: (id: string) => void
  className?: string
}) {
  const [open, setOpen] = useState<GalleryImage>()
  if (images.length === 0) return null
  return (
    <>
      <div className={cx('flex flex-wrap gap-3', className)}>
        {images.map((img) => (
          <Thumb key={img.id} image={img} onOpen={() => setOpen(img)} onRemove={onRemove ? () => onRemove(img.id) : undefined} />
        ))}
      </div>
      {open && <Lightbox image={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}
