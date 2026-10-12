import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** 마크다운 → HTML 문자열. 화면에 그리는 것과 같은 파서(react-markdown + GFM)를 쓴다 */
export function markdownToHtml(markdown: string): string {
  return renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>)
}
