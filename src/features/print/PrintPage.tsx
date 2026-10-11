import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Markdown } from '@/components/Markdown'
import { Button, Segmented, Select } from '@/components/ui'
import { db, useCategories, useProblems } from '@/db'
import { cx } from '@/lib/cx'
import { useObjectUrl } from '@/lib/useObjectUrl'
import { usePageTitle } from '@/lib/usePageTitle'
import type { Category, ImageRecord, Problem } from '@/models/types'
import { RESULT_OPTIONS, STATUS_OPTIONS, parseFilter, serializeFilter, toProblemFilter, type ListFilter } from '../problems/filter'
import { MODE_OPTIONS, applyPrintOptions, parsePrintOptions, type PrintOptions } from './printOptions'

/**
 * 인쇄용 화면. 브라우저 인쇄(Ctrl+P)로 종이에 뽑거나 "PDF로 저장"한다.
 * 화면 위쪽 도구 막대는 인쇄에서 빠지고(print:hidden), 아래 "종이" 부분만 나온다.
 */
export function PrintPage() {
  usePageTitle('인쇄')
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const filter = useMemo(() => parseFilter(params), [params])
  const options = useMemo(() => parsePrintOptions(params), [params])
  const query = useMemo(() => toProblemFilter(filter), [filter])
  const problems = useProblems(query)
  const categories = useCategories()
  const [today] = useState(formatToday)
  const ids = useMemo(() => problems?.map((p) => p.id) ?? [], [problems])
  const wantImages = options.images && options.mode !== 'concepts'
  const images = useLiveQuery(
    () => (wantImages && ids.length ? db.images.where('problemId').anyOf(ids).toArray() : []),
    [wantImages, ids.join('\u0000')],
  )

  // 어두운 테마여도 종이에는 밝은 색으로. 인쇄 직전에 바꿨다가 끝나면 되돌린다
  useEffect(() => {
    const html = document.documentElement
    let previous: string | undefined
    const before = () => {
      previous = html.dataset.theme
      html.dataset.theme = 'light'
    }
    const after = () => {
      if (previous === undefined) delete html.dataset.theme
      else html.dataset.theme = previous
    }
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => {
      window.removeEventListener('beforeprint', before)
      window.removeEventListener('afterprint', after)
    }
  }, [])

  function setFilter(patch: Partial<ListFilter>) {
    const next = applyPrintOptions(serializeFilter({ ...filter, ...patch }), options)
    setParams(next, { replace: true })
  }
  function setOptions(patch: Partial<PrintOptions>) {
    setParams(applyPrintOptions(serializeFilter(filter), { ...options, ...patch }), { replace: true })
  }

  if (!problems || !categories) return null

  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const imagesByProblem = new Map<string, ImageRecord[]>()
  for (const img of images ?? []) imagesByProblem.set(img.problemId, [...(imagesByProblem.get(img.problemId) ?? []), img])
  const printable = options.mode === 'concepts' ? problems.filter((p) => p.explanation.trim()) : problems
  const summary = describeFilter(filter, categoryMap)

  return (
    <div>
      <section className="print:hidden" aria-label="인쇄 설정">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">인쇄</h1>
            <p className="mt-1 text-sm text-muted">
              아래 미리보기가 그대로 종이에 나와요. 인쇄 창에서 대상을 ‘PDF로 저장’으로 고르면 파일로 남길 수 있어요.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => navigate({ pathname: '/', search: serializeFilter(filter).toString() })}>
              목록으로
            </Button>
            <Button
              variant="primary"
              icon={<Printer className="size-4" aria-hidden />}
              onClick={() => window.print()}
              disabled={printable.length === 0}
            >
              인쇄 / PDF 저장
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-card border border-rule bg-paper p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Segmented
              label="인쇄 형식"
              value={options.mode}
              options={MODE_OPTIONS.map(({ value, label }) => ({ value, label }))}
              onChange={(mode) => setOptions({ mode })}
            />
            <span className="text-xs text-neutral">{MODE_OPTIONS.find((o) => o.value === options.mode)?.hint}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-ink-2">
              유형
              <Select value={filter.category} onChange={(e) => setFilter({ category: e.target.value })} className="h-9! w-auto text-sm!" aria-label="유형">
                <option value="">전체</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-2">
              상태
              <Select value={filter.status} onChange={(e) => setFilter({ status: e.target.value as ListFilter['status'] })} className="h-9! w-auto text-sm!" aria-label="상태">
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-ink-2">
              복습 결과
              <Select value={filter.result} onChange={(e) => setFilter({ result: e.target.value as ListFilter['result'] })} className="h-9! w-auto text-sm!" aria-label="복습 결과">
                {RESULT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </label>
            {filter.tags.length > 0 && (
              <span className="text-xs text-neutral">
                태그: {filter.tags.join(', ')}{' '}
                <button type="button" className="underline" onClick={() => setFilter({ tags: [] })}>
                  해제
                </button>
              </span>
            )}
            {filter.q && (
              <span className="text-xs text-neutral">
                검색: “{filter.q}”{' '}
                <button type="button" className="underline" onClick={() => setFilter({ q: '' })}>
                  해제
                </button>
              </span>
            )}
          </div>

          {options.mode !== 'concepts' && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-2">
              {options.mode === 'notes' && (
                <>
                  <Check label="틀린 이유" checked={options.reason} onChange={(reason) => setOptions({ reason })} />
                  <Check label="내 답" checked={options.myAnswer} onChange={(myAnswer) => setOptions({ myAnswer })} />
                </>
              )}
              <Check label="원본 사진" checked={options.images} onChange={(images) => setOptions({ images })} />
            </div>
          )}

          <p className="text-sm text-muted">
            <span className="font-medium text-ink tabular-nums">{printable.length}</span>문제
            {options.mode === 'concepts' && problems.length !== printable.length && (
              <span className="text-neutral"> (풀이가 비어 있는 {problems.length - printable.length}문제는 빠짐)</span>
            )}
          </p>
        </div>
      </section>

      <div className="print-sheet mt-6 rounded-card border border-rule bg-white px-6 py-8 text-[#111] shadow-card print:m-0 print:rounded-none print:border-0 print:p-0 print:shadow-none sm:px-10">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#111] pb-2">
          <h2 className="text-lg font-bold tracking-tight">
            {options.mode === 'concepts' ? '개념 정리' : options.mode === 'quiz' ? '문제' : '오답노트'}
            {summary && <span className="ml-2 text-sm font-normal text-[#555]">{summary}</span>}
          </h2>
          <span className="text-xs text-[#555] tabular-nums">
            {printable.length}문제 · {today}
          </span>
        </header>

        {printable.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#555]">조건에 맞는 문제가 없어요.</p>
        ) : options.mode === 'concepts' ? (
          <ConceptSheet problems={printable} categories={categories} />
        ) : options.mode === 'quiz' ? (
          <QuizSheet problems={printable} categoryMap={categoryMap} images={imagesByProblem} />
        ) : (
          <NotesSheet problems={printable} categoryMap={categoryMap} images={imagesByProblem} options={options} />
        )}
      </div>
    </div>
  )
}

function formatToday(): string {
  return new Date().toLocaleDateString('ko-KR')
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-(--color-accent)" />
      {label}
    </label>
  )
}

function describeFilter(f: ListFilter, categoryMap: Map<string, Category>): string {
  const parts: string[] = []
  if (f.category) parts.push(categoryMap.get(f.category)?.name ?? f.category)
  if (f.status) parts.push(STATUS_OPTIONS.find((o) => o.value === f.status)?.label ?? f.status)
  if (f.result) parts.push(RESULT_OPTIONS.find((o) => o.value === f.result)?.label ?? f.result)
  if (f.tags.length) parts.push(f.tags.map((t) => `#${t}`).join(' '))
  if (f.q.trim()) parts.push(`“${f.q.trim()}”`)
  return parts.join(' · ')
}

function Meta({ problem, category, index }: { problem: Problem; category?: Category; index: number }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-[#555]">
      <span className="text-sm font-bold text-[#111] tabular-nums">{index + 1}.</span>
      <span className="font-medium">{category?.name ?? problem.category}</span>
      {problem.source && <span>{problem.source}</span>}
      {problem.tags.length > 0 && <span>{problem.tags.map((t) => `#${t}`).join(' ')}</span>}
    </div>
  )
}

function Label({ children }: { children: string }) {
  return <span className="mr-1.5 inline-block rounded-[3px] border border-[#999] px-1 text-[0.7rem] font-semibold tracking-wide text-[#333] align-middle">{children}</span>
}

function PrintImages({ images }: { images: ImageRecord[] }) {
  if (images.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {images.map((img) => (
        <PrintImage key={img.id} image={img} />
      ))}
    </div>
  )
}

function PrintImage({ image }: { image: ImageRecord }) {
  const url = useObjectUrl(image.blob)
  return url ? <img src={url} alt={image.name} className="max-h-64 max-w-full rounded-[4px] border border-[#ccc] object-contain" /> : null
}

/** 객관식 보기. 본문에 보기가 이미 전부 적혀 있으면(Claude가 사진을 옮긴 경우) 다시 쓰지 않는다 */
function Choices({ problem }: { problem: Problem }) {
  if (problem.answerType !== 'choice' || !problem.choices?.length) return null
  if (problem.choices.every((c) => problem.question.includes(c))) return null
  return (
    <ol className="mt-1.5 list-decimal space-y-0.5 pl-6 text-sm">
      {problem.choices.map((c, i) => (
        <li key={i}>{c}</li>
      ))}
    </ol>
  )
}

/** 문제 → 정답 → 풀이 → 틀린 이유 */
function NotesSheet({
  problems,
  categoryMap,
  images,
  options,
}: {
  problems: Problem[]
  categoryMap: Map<string, Category>
  images: Map<string, ImageRecord[]>
  options: PrintOptions
}) {
  return (
    <ol className="divide-y divide-[#ddd]" aria-label="인쇄할 문제">
      {problems.map((p, i) => (
        <li key={p.id} className="print-item py-4 text-sm leading-relaxed">
          <Meta problem={p} category={categoryMap.get(p.category)} index={i} />
          <div className="mt-1.5">
            <Markdown className="text-[0.92rem]">{p.question}</Markdown>
            <Choices problem={p} />
            {options.images && <PrintImages images={images.get(p.id) ?? []} />}
          </div>
          <div className="mt-2.5 space-y-1.5">
            {options.myAnswer && p.myAnswer.trim() && (
              <p>
                <Label>내 답</Label>
                <span className="text-[#555]">{p.myAnswer}</span>
              </p>
            )}
            <p>
              <Label>정답</Label>
              <span className="font-semibold">{p.correctAnswer || '(없음)'}</span>
            </p>
            {p.explanation.trim() && (
              <div className="rounded-[4px] bg-[#f5f5f5] px-3 py-2 print:bg-transparent print:px-0 print:py-0">
                <Label>풀이</Label>
                <Markdown className="mt-1 text-[0.88rem]">{p.explanation}</Markdown>
              </div>
            )}
            {options.reason && p.wrongReason.trim() && (
              <div>
                <Label>틀린 이유</Label>
                <Markdown className="mt-1 text-[0.88rem]">{p.wrongReason}</Markdown>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** 풀이(핵심 개념)만 유형별로 */
function ConceptSheet({ problems, categories }: { problems: Problem[]; categories: Category[] }) {
  const groups = categories
    .map((c) => ({ category: c, items: problems.filter((p) => p.category === c.id) }))
    .filter((g) => g.items.length > 0)
  const orphan = problems.filter((p) => !categories.some((c) => c.id === p.category))
  if (orphan.length) groups.push({ category: { id: '', name: '기타', description: '', order: 999 }, items: orphan })
  let n = 0
  return (
    <div className="space-y-6 pt-2">
      {groups.map((g) => (
        <section key={g.category.id} aria-label={g.category.name}>
          <h3 className="print-keep-next mb-2 border-b border-[#ccc] pb-1 text-base font-bold">{g.category.name}</h3>
          <ol className="space-y-3">
            {g.items.map((p) => (
              <li key={p.id} className="print-item text-sm leading-relaxed">
                <p className="text-xs text-[#555]">
                  <span className="font-bold text-[#111] tabular-nums">{++n}.</span> {p.correctAnswer && <span className="font-medium text-[#111]">{p.correctAnswer}</span>}
                  {p.tags.length > 0 && <span className="ml-1.5">{p.tags.map((t) => `#${t}`).join(' ')}</span>}
                </p>
                <Markdown className="mt-0.5 text-[0.88rem]">{p.explanation}</Markdown>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

/** 문제만, 정답은 맨 뒤 장에 */
function QuizSheet({ problems, categoryMap, images }: { problems: Problem[]; categoryMap: Map<string, Category>; images: Map<string, ImageRecord[]> }) {
  return (
    <>
      <ol className="divide-y divide-[#ddd]" aria-label="인쇄할 문제">
        {problems.map((p, i) => (
          <li key={p.id} className="print-item py-4 text-sm leading-relaxed">
            <Meta problem={p} category={categoryMap.get(p.category)} index={i} />
            <div className="mt-1.5">
              <Markdown className="text-[0.92rem]">{p.question}</Markdown>
              <Choices problem={p} />
              <PrintImages images={images.get(p.id) ?? []} />
            </div>
            <div className={cx('mt-3 border-b border-dotted border-[#999]', p.answerType === 'essay' ? 'h-16' : 'h-7')} aria-hidden />
          </li>
        ))}
      </ol>
      <section className="print-break-before mt-8 border-t-2 border-[#111] pt-3" aria-label="정답">
        <h3 className="text-base font-bold">정답</h3>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {problems.map((p, i) => (
              <tr key={p.id} className="border-b border-[#ddd] align-top">
                <td className="w-10 py-1 pr-2 font-bold tabular-nums">{i + 1}.</td>
                <td className="py-1">{p.correctAnswer || '(없음)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
