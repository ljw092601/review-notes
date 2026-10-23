import { createContext, useContext, type ComponentProps } from 'react'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { figureKey, resolveFigure } from '@/lib/figures'
import { useObjectUrl } from '@/lib/useObjectUrl'

export interface MarkdownImage {
  name: string
  blob: Blob
}

/** 본문이 `img:이름`으로 참조할 수 있는 첨부 이미지. Markdown.tsx가 넣어 준다 */
const FigureContext = createContext<readonly MarkdownImage[]>([])

/** 기본 변환은 모르는 스킴을 지우므로 `img:`만 그대로 통과시킨다 */
function urlTransform(url: string): string {
  return figureKey(url) ? url : defaultUrlTransform(url)
}

function Figure({ image, alt }: { image: MarkdownImage; alt: string }) {
  const url = useObjectUrl(image.blob)
  if (!url) return <span className="block h-24 rounded-control bg-paper-2" aria-label={alt || image.name} />
  return <img src={url} alt={alt || image.name} className="md-figure" />
}

function Img({ src, alt, ...rest }: ComponentProps<'img'>) {
  const images = useContext(FigureContext)
  const key = figureKey(typeof src === 'string' ? src : undefined)
  if (!key) return <img src={src} alt={alt} {...rest} />
  const image = resolveFigure(images, key)
  if (!image) return <span className="text-sm text-neutral">[그림 없음: {key}]</span>
  return <Figure image={image} alt={alt ?? ''} />
}

const components = { img: Img }

/** react-markdown + remark-gfm 본체. Markdown.tsx가 lazy로 불러온다. */
export default function MarkdownInner({ children, images }: { children: string; images?: readonly MarkdownImage[] }) {
  return (
    <FigureContext.Provider value={images ?? NONE}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={components}>
        {children}
      </ReactMarkdown>
    </FigureContext.Provider>
  )
}

const NONE: readonly MarkdownImage[] = []
