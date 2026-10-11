import { FileJson, Image as ImageIcon } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CategoryBadge } from '@/components/badges'
import { Badge, Button, Card, SectionTitle } from '@/components/ui'
import { useToast } from '@/components/toast-context'
import { ImportFormatError, importProblems, previewImport, useCategories, type ImportPreview } from '@/db'
import { cx } from '@/lib/cx'
import { excerpt } from '@/lib/text'
import type { Category } from '@/models/types'
import { readFileText } from './download'

type State =
  | { kind: 'idle' }
  | { kind: 'reading' }
  | { kind: 'error'; name: string; issues: string[] }
  | { kind: 'preview'; name: string; preview: ImportPreview }

export function ImportCard() {
  const navigate = useNavigate()
  const toast = useToast()
  const categories = useCategories()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [dragging, setDragging] = useState(false)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [importing, setImporting] = useState(false)

  async function accept(files: FileList | File[]) {
    const file = Array.from(files).find((f) => f.name.toLowerCase().endsWith('.json') || f.type === 'application/json')
    if (!file) {
      setState({ kind: 'error', name: '', issues: ['JSON 파일만 가져올 수 있어요'] })
      return
    }
    setState({ kind: 'reading' })
    setIncludeDuplicates(false)
    try {
      const text = await readFileText(file)
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        setState({ kind: 'error', name: file.name, issues: ['JSON 문법이 잘못되었어요'] })
        return
      }
      const preview = await previewImport(json)
      setState({ kind: 'preview', name: file.name, preview })
    } catch (e) {
      const issues = e instanceof ImportFormatError ? e.issues : [e instanceof Error ? e.message : String(e)]
      setState({ kind: 'error', name: file.name, issues })
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void accept(e.dataTransfer.files)
  }

  async function runImport() {
    if (state.kind !== 'preview') return
    setImporting(true)
    try {
      const willAdd = state.preview.items.filter((it) => includeDuplicates || !it.duplicateOf)
      const hasDraft = willAdd.some((it) => it.problem.status === 'draft')
      const result = await importProblems(state.preview, { skipDuplicates: !includeDuplicates })
      toast.show(result.skipped > 0 ? `${result.added}개 가져왔어요 (${result.skipped}개 건너뜀)` : `${result.added}개 가져왔어요`)
      navigate(result.added > 0 && hasDraft ? '/drafts' : '/')
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '가져오기에 실패했어요', { tone: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const categoryMap = new Map<string, Category>(categories?.map((c) => [c.id, c]))

  return (
    <Card as="section" className="p-5 sm:p-6">
      <SectionTitle>가져오기</SectionTitle>
      <p className="mt-1.5 text-sm text-muted">
        사진을 <code className="rounded-[4px] bg-paper-2 px-1 font-mono text-[0.85em]">inbox/&lt;날짜&gt;/</code>에 넣고 Claude Code에서 “오답 정리해줘”라고 하면{' '}
        <code className="rounded-[4px] bg-paper-2 px-1 font-mono text-[0.85em]">inbox/out/&lt;날짜&gt;.json</code>이 만들어져요. 그 파일이나 내보내기 백업 파일을 여기에 놓으세요.
      </p>

      {state.kind !== 'preview' && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            'mt-4 flex flex-col items-center justify-center gap-1 rounded-control border border-dashed px-4 py-8 text-center transition-[background-color,border-color] duration-(--dur-micro)',
            dragging ? 'border-accent bg-accent-soft' : 'border-rule-2 bg-paper',
          )}
        >
          <Button
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            loading={state.kind === 'reading'}
            icon={<FileJson className="size-4" aria-hidden />}
          >
            {state.kind === 'reading' ? '파일 읽는 중' : 'JSON 파일 고르기'}
          </Button>
          <p className="text-xs text-neutral">끌어다 놓아도 돼요.</p>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            aria-label="가져올 JSON 파일"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) void accept(e.target.files)
              e.target.value = ''
            }}
          />
        </div>
      )}

      {state.kind === 'error' && (
        <div role="alert" className="mt-4 rounded-control border border-error/40 bg-error-soft px-4 py-3 text-sm text-error">
          <p className="font-medium">{state.name ? `${state.name}을(를) 가져올 수 없어요` : '가져올 수 없어요'}</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {state.issues.map((issue, i) => (
              <li key={i} className="font-mono text-xs break-all">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {state.kind === 'preview' && (
        <PreviewPanel
          name={state.name}
          preview={state.preview}
          categoryMap={categoryMap}
          includeDuplicates={includeDuplicates}
          onIncludeDuplicates={setIncludeDuplicates}
          importing={importing}
          onImport={() => void runImport()}
          onReset={() => setState({ kind: 'idle' })}
        />
      )}
    </Card>
  )
}

function PreviewPanel({
  name,
  preview,
  categoryMap,
  includeDuplicates,
  onIncludeDuplicates,
  importing,
  onImport,
  onReset,
}: {
  name: string
  preview: ImportPreview
  categoryMap: Map<string, Category>
  includeDuplicates: boolean
  onIncludeDuplicates: (v: boolean) => void
  importing: boolean
  onImport: () => void
  onReset: () => void
}) {
  const duplicates = preview.items.filter((it) => it.duplicateOf).length
  const attempts = preview.file.attempts?.length ?? 0
  const fileCategories = preview.file.categories?.length ?? 0
  const toAdd = includeDuplicates ? preview.items.length : preview.items.length - duplicates

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-medium text-ink">{name}</span>
        <span className="text-muted">
          문제 <span className="tabular-nums">{preview.items.length}</span>개
          {duplicates > 0 && (
            <>
              {' · '}중복 <span className="tabular-nums">{duplicates}</span>개
            </>
          )}
          {attempts > 0 && (
            <>
              {' · '}복습 기록 <span className="tabular-nums">{attempts}</span>개
            </>
          )}
          {fileCategories > 0 && (
            <>
              {' · '}유형 <span className="tabular-nums">{fileCategories}</span>개
            </>
          )}
        </span>
      </div>

      {preview.unknownCategories.length > 0 && (
        <p className="mt-2 rounded-control bg-warn-soft px-3 py-2 text-xs text-warn">
          {preview.unknownCategories.map((c) => `‘${c}’`).join(', ')} 유형은 앱에 없어서 ‘기타’로 들어가요.
        </p>
      )}

      {preview.missingImages > 0 && (
        <p className="mt-2 rounded-control bg-warn-soft px-3 py-2 text-xs text-warn">
          사진 {preview.missingImages}장은 경로만 있어 가져오지 않아요. 자동 백업 파일은 ‘자동 백업 → 폴더에서 복원’으로 불러오세요.
        </p>
      )}

      {preview.items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral">파일에 문제가 없어요.</p>
      ) : (
        <ul className="mt-3 divide-y divide-rule rounded-control border border-rule" aria-label="가져올 문제">
          {preview.items.map(({ problem, duplicateOf }, i) => {
            const skipped = duplicateOf && !includeDuplicates
            return (
              <li key={i} className={cx('px-3.5 py-3', skipped && 'opacity-55')}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={categoryMap.get(problem.category)} id={problem.category} />
                  {duplicateOf && <Badge tone="warn">이미 있음</Badge>}
                  {problem.answerConfidence === 'low' && <Badge tone="error">정답 확인 필요</Badge>}
                  {problem.source && <span className="text-xs text-neutral">{problem.source}</span>}
                  {problem.images.length > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 text-xs text-neutral tabular-nums">
                      <ImageIcon className="size-3.5" aria-hidden />
                      {problem.images.length}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink">{excerpt(problem.question)}</p>
              </li>
            )
          })}
        </ul>
      )}

      {duplicates > 0 && (
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={includeDuplicates}
            onChange={(e) => onIncludeDuplicates(e.target.checked)}
            className="size-4 accent-(--color-accent)"
          />
          이미 있는 문제도 가져오기
        </label>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onImport} loading={importing} disabled={toAdd === 0}>
          {toAdd}개 가져오기
        </Button>
        <Button variant="ghost" onClick={onReset} disabled={importing}>
          다른 파일 고르기
        </Button>
      </div>
    </div>
  )
}
