import { ArrowLeft, Download, RotateCcw, Eraser } from 'lucide-react'
import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/toast-context'
import { Button, Card, Input, Select } from '@/components/ui'
import { setSetting, useCategories, useProblems, useSetting } from '@/db'
import { cx } from '@/lib/cx'
import { usePageTitle } from '@/lib/usePageTitle'
import type { Category, Problem } from '@/models/types'
import { downloadText } from '../transfer/download'
import {
  ankiFilename,
  buildAnkiFile,
  buildBackExtra,
  candidateTerms,
  findTermBlanks,
  parseDataT,
  renderAnki,
  renderPreview,
  toggleBlankAt,
  validBlanks,
  withText,
  type AnkiRow,
  type Blank,
  type StoredBlank,
} from './cloze'
import { markdownToHtml } from './markdownHtml'

const DEFAULT_DECK = '정처기'
const DEFAULT_NOTE_TYPE = 'Cloze'

interface Entry {
  problem: Problem
  html: string
  /** 정답·태그로 자동 제안한 자리 */
  auto: Blank[]
  /** 지금 고른 자리. 저장된 게 없으면 auto */
  blanks: Blank[]
  /** 사용자가 손댄 적이 있는가(저장된 선택이 있는가) */
  custom: boolean
}

/**
 * Anki 빈칸 카드 내보내기. 앞면은 핵심 개념에서 단어를 가린 것, 뒷면은 전체 개념 + 문제·정답.
 * 가릴 단어는 미리보기에서 클릭해 켜고 끈다(자리마다 따로). 선택은 settings에 저장된다.
 * 결과는 Anki의 "파일 → 가져오기"로 읽는 탭 구분 텍스트 파일이다.
 */
export function AnkiPage() {
  usePageTitle('Anki 내보내기')
  const navigate = useNavigate()
  const toast = useToast()
  const [category, setCategory] = useState('')
  const [onlyDone, setOnlyDone] = useState(false)
  const [perTerm, setPerTerm] = useState(false)
  /** 체크를 푼 문제 id. 기본은 전부 포함이라 '뺀 것'만 기억한다 */
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set())
  const [includeQuestion, setIncludeQuestion] = useState(false)
  const [deck, setDeck] = useState(DEFAULT_DECK)
  const [noteType, setNoteType] = useState(DEFAULT_NOTE_TYPE)
  const problems = useProblems({ category: category || undefined, status: onlyDone ? 'done' : undefined, sort: 'createdDesc' })
  const categories = useCategories()
  const stored = useSetting('ankiBlanks')

  const entries = useMemo<Entry[] | undefined>(() => {
    if (!problems || stored === undefined) return undefined
    return problems
      .filter((p) => p.explanation.trim())
      .map((p) => {
        const html = markdownToHtml(p.explanation)
        const auto = findTermBlanks(html, candidateTerms(p))
        const saved = stored?.[p.id]
        const blanks = saved ? validBlanks(html, saved) : auto
        return { problem: p, html, auto, blanks, custom: !!saved }
      })
  }, [problems, stored])

  if (!entries || !problems || !categories) return null
  const categoryMap = new Map(categories.map((c) => [c.id, c]))
  const ready = entries.filter((e) => e.blanks.length > 0)
  const selected = ready.filter((e) => !excluded.has(e.problem.id))
  const noExplanation = problems.length - entries.length

  function setChecked(id: string, on: boolean) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save(entry: Entry, blanks: Blank[] | null) {
    const next: Record<string, StoredBlank[]> = { ...(stored ?? {}) }
    if (blanks === null) delete next[entry.problem.id]
    else next[entry.problem.id] = withText(entry.html, blanks)
    await setSetting('ankiBlanks', next)
  }

  function exportFile() {
    let cards = 0
    const rows: AnkiRow[] = selected.map((e) => {
      const r = renderAnki(e.html, e.blanks, { perTerm })
      cards += r.cards
      return {
        text: r.html,
        backExtra: buildBackExtra(e.problem, includeQuestion ? markdownToHtml(e.problem.question) : null, categoryMap.get(e.problem.category)),
        tags: [categoryMap.get(e.problem.category)?.name ?? e.problem.category, ...e.problem.tags],
        guid: `reviewnotes-${e.problem.id}`,
      }
    })
    downloadText(ankiFilename(), buildAnkiFile(rows, { deck, noteType }), 'text/plain;charset=utf-8')
    toast.show(`노트 ${rows.length}개(카드 ${cards}장)를 내보냈어요. Anki에서 파일 → 가져오기로 여세요`)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Anki 내보내기</h1>
          <p className="mt-1 text-sm text-muted">
            풀이의 핵심 개념에서 <strong className="font-medium text-ink">단어를 클릭해 빈칸</strong>으로 만들어요. 앞면은 빈칸, 뒷면은 전체 개념과 문제·정답이에요.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => navigate('/transfer')}>
            가져오기 / 내보내기
          </Button>
          <Button variant="primary" icon={<Download className="size-4" aria-hidden />} onClick={exportFile} disabled={selected.length === 0}>
            {selected.length > 0 ? `${selected.length}개 Anki 파일 받기` : 'Anki 파일 받기'}
          </Button>
        </div>
      </div>

      <Card as="section" className="mt-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
          <label className="flex items-center gap-1.5">
            유형
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9! w-auto text-sm!" aria-label="유형">
              <option value="">전체</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <Check label="완료된 문제만" checked={onlyDone} onChange={setOnlyDone} />
          <Check label="단어마다 카드 따로 (c1, c2…)" checked={perTerm} onChange={setPerTerm} />
          <Check label="뒷면에 문제 본문 넣기" checked={includeQuestion} onChange={setIncludeQuestion} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-2">
          <label className="flex items-center gap-1.5">
            덱 이름
            <Input value={deck} onChange={(e) => setDeck(e.target.value)} className="h-9! w-56 text-sm!" aria-label="덱 이름" />
            <span className="text-xs text-neutral">이미 있는 덱 이름을 쓰면 거기에 추가돼요. 하위 덱은 ‘상위::하위’</span>
          </label>
          <label className="flex items-center gap-1.5">
            노트 유형
            <Input value={noteType} onChange={(e) => setNoteType(e.target.value)} className="h-9! w-40 text-sm!" aria-label="노트 유형" />
            <span className="text-xs text-neutral">한국어 Anki면 ‘빈칸 채우기’. 비우면 가져올 때 직접 골라요</span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span>
            선택 <span className="font-medium text-ink tabular-nums">{selected.length}</span> / {ready.length}개
            {entries.length - ready.length > 0 && <span className="text-neutral"> · 빈칸 없는 {entries.length - ready.length}개는 빠짐</span>}
            {noExplanation > 0 && <span className="text-neutral"> · 풀이 없는 {noExplanation}개는 빠짐</span>}
          </span>
          {ready.length > 0 && (
            <span className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setExcluded(new Set())} disabled={selected.length === ready.length}>
                전체 선택
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setExcluded(new Set(ready.map((e) => e.problem.id)))} disabled={selected.length === 0}>
                전체 해제
              </Button>
            </span>
          )}
        </div>
      </Card>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-neutral">풀이가 적힌 문제가 없어요. 입력 필요 화면에서 풀이를 채우거나, Claude가 만든 문제를 가져오세요.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3" aria-label="Anki 카드 미리보기">
          {entries.map((e) => (
            <EntryCard
              key={e.problem.id}
              entry={e}
              category={categoryMap.get(e.problem.category)}
              checked={e.blanks.length > 0 && !excluded.has(e.problem.id)}
              onCheck={(on) => setChecked(e.problem.id, on)}
              onChange={(blanks) => void save(e, blanks)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-(--color-accent)" />
      {label}
    </label>
  )
}

function EntryCard({
  entry,
  category,
  checked,
  onCheck,
  onChange,
}: {
  entry: Entry
  category?: Category
  checked: boolean
  onCheck: (on: boolean) => void
  onChange: (blanks: Blank[] | null) => void
}) {
  const { problem, html, blanks, auto, custom } = entry
  const preview = useMemo(() => renderPreview(html, blanks), [html, blanks])
  const context = `${problem.explanation}\n${problem.correctAnswer}\n${problem.tags.join(' ')}`

  function onClick(ev: MouseEvent<HTMLDivElement>) {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-t]')
    const at = parseDataT(target?.dataset.t)
    if (!at) return
    onChange(toggleBlankAt(html, blanks, at, context))
  }

  return (
    <li>
      <Card as="article" className={cx('p-4 sm:p-5', blanks.length === 0 && 'border-warn/50', blanks.length > 0 && !checked && 'opacity-60')}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral">
          <input
            type="checkbox"
            checked={checked}
            disabled={blanks.length === 0}
            onChange={(e) => onCheck(e.target.checked)}
            aria-label={`${problem.question.replace(/\s+/g, ' ').slice(0, 40)} 내보내기에 포함`}
            className="size-4 accent-(--color-accent)"
          />
          <span className="font-medium text-ink-2">{category?.name ?? problem.category}</span>
          {problem.source && <span>{problem.source}</span>}
          <span className="ml-auto tabular-nums">{blanks.length === 0 ? '빈칸 없음 — 내보내지 않음' : `빈칸 ${blanks.length}개`}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-ink">{problem.question.replace(/\s+/g, ' ')}</p>

        <div
          className="md anki-preview mt-3 rounded-control bg-paper-2 px-3.5 py-3 text-sm"
          role="group"
          aria-label="단어를 클릭하면 빈칸이 돼요"
          onClick={onClick}
          dangerouslySetInnerHTML={{ __html: preview }}
        />

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral">
          <span>단어를 클릭하면 빈칸, 다시 클릭하면 해제</span>
          {custom && (
            <Button variant="ghost" size="sm" icon={<RotateCcw className="size-3.5" aria-hidden />} onClick={() => onChange(null)} disabled={auto.length === 0}>
              자동 제안으로
            </Button>
          )}
          {blanks.length > 0 && (
            <Button variant="ghost" size="sm" icon={<Eraser className="size-3.5" aria-hidden />} onClick={() => onChange([])}>
              모두 지우기
            </Button>
          )}
        </div>
      </Card>
    </li>
  )
}
