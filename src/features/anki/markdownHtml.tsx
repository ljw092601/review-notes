import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { figureKey } from '@/lib/figures'

/** Anki 카드에는 앱 안의 사진을 넣을 수 없어 `img:` 그림은 자리 표시만 남긴다 */
// oxlint-disable-next-line react/only-export-components -- 렌더 전용 헬퍼. 화면 컴포넌트가 아니라 HTML 문자열을 만든다
function Img({ src, alt, ...rest }: ComponentProps<'img'>) {
  const key = figureKey(typeof src === 'string' ? src : undefined)
  if (key) return <span style={{ color: '#777' }}>[그림{alt ? `: ${alt}` : ''}]</span>
  return <img src={src} alt={alt} {...rest} />
}
const components = { img: Img }
const urlTransform = (url: string) => (figureKey(url) ? url : defaultUrlTransform(url))

/** 마크다운 → HTML 문자열. 화면에 그리는 것과 같은 파서(react-markdown + GFM)를 쓴다 */
export function markdownToHtml(markdown: string): string {
  return renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={urlTransform} components={components}>
      {markdown}
    </ReactMarkdown>,
  )
}
