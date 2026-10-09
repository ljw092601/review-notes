import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** react-markdown + remark-gfm 본체. Markdown.tsx가 lazy로 불러온다. */
export default function MarkdownInner({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
}
