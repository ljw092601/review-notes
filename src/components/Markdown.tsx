import { Suspense, lazy } from 'react'
import { cx } from '@/lib/cx'

// 마크다운 파서는 번들에서 가장 큰 덩어리라 처음 필요할 때 받는다
const MarkdownInner = lazy(() => import('./MarkdownInner'))

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cx('md', className)}>
      <Suspense fallback={<p className="whitespace-pre-wrap">{children}</p>}>
        <MarkdownInner>{children}</MarkdownInner>
      </Suspense>
    </div>
  )
}
