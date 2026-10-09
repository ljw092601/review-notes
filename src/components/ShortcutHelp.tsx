import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const GROUPS: Array<{ title: string; items: Array<[keys: string[], label: string]> }> = [
  {
    title: '어디서나',
    items: [
      [['n'], '새 문제'],
      [['l'], '문제 목록'],
      [['i'], '입력 필요'],
      [['r'], '복습'],
      [['t'], '가져오기 / 내보내기'],
      [['/'], '목록에서 검색'],
      [['?'], '이 도움말'],
    ],
  },
  {
    title: '문제 상세',
    items: [[['e'], '편집']],
  },
  {
    title: '작성 · 입력 필요',
    items: [
      [['Ctrl', 'Enter'], '저장'],
      [['Ctrl', 'V'], '클립보드 사진 붙여넣기'],
    ],
  },
  {
    title: '복습',
    items: [
      [['Ctrl', 'Enter'], '정답 확인'],
      [['1'], '틀림'],
      [['2'], '부분'],
      [['3'], '맞음'],
    ],
  },
]

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-[6px] whitespace-nowrap border border-rule-2 bg-paper px-1.5 text-[0.72rem] font-medium text-ink-2 shadow-[inset_0_-1px_0_var(--color-rule-2)]">
      {children}
    </kbd>
  )
}

export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-card border border-rule bg-paper p-5 shadow-lift sm:p-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="shortcut-help-title" className="text-lg font-bold tracking-tight">
            키보드 단축키
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-9 items-center justify-center rounded-control text-ink-2 hover:bg-paper-2"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">{g.title}</h3>
              <dl className="mt-2 space-y-1.5">
                {g.items.map(([keys, label]) => (
                  <div key={label} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-ink-2">{label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-neutral">+</span>}
                          <Key>{k}</Key>
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="mt-5 text-xs text-neutral">입력란에 커서가 있을 때는 글자 단축키가 꺼져요. Esc로 닫기.</p>
      </div>
    </div>
  )
}
