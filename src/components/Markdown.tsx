import { Suspense, lazy } from 'react'
import { cx } from '@/lib/cx'
import type { MarkdownImage } from './MarkdownInner'

// 마크다운 파서는 번들에서 가장 큰 덩어리라 처음 필요할 때 받는다
const MarkdownInner = lazy(() => import('./MarkdownInner'))

export type { MarkdownImage }

/**
 * @param images 본문이 `![..](img:이름)`으로 참조할 수 있는 첨부 이미지(문제 본문에만 넘긴다)
 */
export function Markdown({ children, className, images }: { children: string; className?: string; images?: readonly MarkdownImage[] }) {
  return (
    <div className={cx('md', className)}>
      <Suspense fallback={<p className="whitespace-pre-wrap">{children}</p>}>
        <MarkdownInner images={images}>{children}</MarkdownInner>
      </Suspense>
    </div>
  )
}
