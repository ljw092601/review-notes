import { Download, Eye, EyeOff } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/toast-context'
import { Badge, Button, Card, Segmented } from '@/components/ui'
import { usePageTitle } from '@/lib/usePageTitle'
import { downloadText } from '../transfer/download'
import { buildStudyAnkiFile, STUDY_ANKI_FILENAME } from './anki'
import { STUDY_TOPICS, type StudyGroup, type StudyItem, type StudyTopic } from './content'

/** 가리기: 용어를 가리면 설명을 보고 이름을, 설명을 가리면 이름을 보고 정의를 떠올린다 */
export type HideMode = 'none' | 'term' | 'desc'

const HIDE_OPTIONS: Array<{ value: HideMode; label: string }> = [
  { value: 'none', label: '모두 보기' },
  { value: 'term', label: '용어 가리기' },
  { value: 'desc', label: '설명 가리기' },
]

const itemKey = (group: StudyGroup, i: number) => `${group.id}:${i}`

/** 가린 칸. 누르면 그 칸만 드러난다 */
function Hidden({ hidden, label, onReveal, children }: { hidden: boolean; label: string; onReveal: () => void; children: ReactNode }) {
  if (!hidden) return <>{children}</>
  return (
    <button
      type="button"
      onClick={onReveal}
      aria-label={`${label} 보기`}
      className="flex min-h-9 w-full items-center rounded-control border border-dashed border-rule-2 bg-paper-2 px-3 text-left text-sm text-neutral transition-[background-color] duration-(--dur-micro) hover:bg-accent-soft hover:text-accent-deep"
    >
      눌러서 보기
    </button>
  )
}

function ItemRow({ item, index, hideTerm, hideDesc, onReveal }: { item: StudyItem; index: number; hideTerm: boolean; hideDesc: boolean; onReveal: () => void }) {
  return (
    <li className="grid gap-x-5 gap-y-1.5 px-4 py-3.5 sm:grid-cols-[15rem_1fr] sm:px-5">
      <div className="flex min-w-0 gap-2.5">
        <span className="mt-0.5 w-5 shrink-0 text-right text-sm font-semibold text-neutral tabular-nums">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <Hidden hidden={hideTerm} label={`${index + 1}번 용어`} onReveal={onReveal}>
            <p className="font-semibold text-ink">{item.term}</p>
            {item.en && <p className="text-sm text-muted">{item.en}</p>}
          </Hidden>
        </div>
      </div>
      <div className="min-w-0 pl-7 sm:pl-0">
        <Hidden hidden={hideDesc} label={`${index + 1}번 설명`} onReveal={onReveal}>
          <p className="text-[0.95rem] leading-relaxed text-ink-2">{item.desc}</p>
          {item.tip && (
            <p className="mt-1.5 text-sm text-muted">
              <span className="mr-1.5 font-semibold text-accent-deep">구별</span>
              {item.tip}
            </p>
          )}
        </Hidden>
      </div>
    </li>
  )
}

function GroupCard({ group, mode, revealed, onReveal }: { group: StudyGroup; mode: HideMode; revealed: ReadonlySet<string>; onReveal: (key: string) => void }) {
  return (
    <Card as="section" className="overflow-hidden">
      <header className="border-b border-rule px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink">{group.title}</h2>
          {group.order && <Badge tone="accent">{group.order}</Badge>}
        </div>
        {group.note && <p className="mt-1 text-sm text-muted">{group.note}</p>}
        {group.mnemonic && mode !== 'term' && (
          <p className="mt-1.5 text-sm text-ink-2">
            <span className="mr-1.5 font-semibold">앞 글자</span>
            {group.mnemonic}
          </p>
        )}
      </header>
      <ol className="divide-y divide-rule">
        {group.items.map((item, i) => {
          const key = itemKey(group, i)
          const shown = revealed.has(key)
          return (
            <ItemRow
              key={key}
              item={item}
              index={i}
              hideTerm={mode === 'term' && !shown}
              hideDesc={mode === 'desc' && !shown}
              onReveal={() => onReveal(key)}
            />
          )
        })}
      </ol>
    </Card>
  )
}

export function StudyView({ topic }: { topic: StudyTopic }) {
  const [mode, setMode] = useState<HideMode>('none')
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set())
  const allKeys = topic.groups.flatMap((g) => g.items.map((_, i) => itemKey(g, i)))
  const hiddenCount = mode === 'none' ? 0 : allKeys.filter((k) => !revealed.has(k)).length

  function changeMode(next: HideMode) {
    setMode(next)
    setRevealed(new Set())
  }

  return (
    <div>
      <p className="mt-4 max-w-prose text-[0.95rem] text-ink-2">{topic.intro}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted" aria-hidden>
          가리기
        </span>
        <Segmented label="가리기" value={mode} onChange={changeMode} options={HIDE_OPTIONS} />
        {mode !== 'none' && (
          <>
            <Button size="sm" icon={<Eye className="size-4" aria-hidden />} disabled={hiddenCount === 0} onClick={() => setRevealed(new Set(allKeys))}>
              다 펼치기
            </Button>
            <Button size="sm" icon={<EyeOff className="size-4" aria-hidden />} disabled={revealed.size === 0} onClick={() => setRevealed(new Set())}>
              다시 가리기
            </Button>
            <span className="text-sm text-neutral tabular-nums">남은 칸 {hiddenCount}</span>
          </>
        )}
      </div>
      <div className="mt-5 grid gap-5">
        {topic.groups.map((g) => (
          <GroupCard key={g.id} group={g} mode={mode} revealed={revealed} onReveal={(key) => setRevealed((cur) => new Set(cur).add(key))} />
        ))}
      </div>
    </div>
  )
}

export function StudyPage() {
  usePageTitle('암기')
  const [params, setParams] = useSearchParams()
  const toast = useToast()
  const topic = STUDY_TOPICS.find((t) => t.id === params.get('t')) ?? STUDY_TOPICS[0]

  /** 전 주제를 '용어 가리기' 카드로: 묶음마다 1장, 앞면 설명들, 뒷면 용어 표 */
  function exportAnki() {
    const { text, cards } = buildStudyAnkiFile(STUDY_TOPICS)
    downloadText(STUDY_ANKI_FILENAME, text)
    toast.show(`묶음별 카드 ${cards}장을 내보냈어요. Anki에서 파일 → 가져오기로 열고 노트 유형은 ‘기본(Basic)’을 고르세요`)
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">암기</h1>
          <p className="mt-1 text-sm text-muted">기출에 자주 나오는 개념을 표로 정리했어요. 가리기를 켜고 눌러 가며 외워 보세요.</p>
        </div>
        <Button icon={<Download className="size-4" aria-hidden />} onClick={exportAnki}>
          Anki 파일 받기
        </Button>
      </div>
      <div className="mt-5 overflow-x-auto">
        <Segmented
          label="주제"
          value={topic.id}
          onChange={(id) => setParams(id === STUDY_TOPICS[0].id ? {} : { t: id }, { replace: true })}
          options={STUDY_TOPICS.map((t) => ({ value: t.id, label: t.title }))}
        />
      </div>
      <StudyView key={topic.id} topic={topic} />
    </div>
  )
}
