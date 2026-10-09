import { Keyboard, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom'
import { useDraftCount } from '@/db'
import { cx } from '@/lib/cx'
import { useShortcuts, type Shortcut } from '@/lib/useShortcuts'
import { ShortcutHelp } from './ShortcutHelp'
import { ThemeToggle } from './ThemeToggle'
import { ToastProvider } from './toast'
import { Button } from './ui'

const nav = [
  { to: '/', label: '문제', key: 'l' },
  { to: '/drafts', label: '입력 필요', key: 'i' },
  { to: '/quiz', label: '복습', key: 'r' },
  { to: '/transfer', label: '가져오기', key: 't' },
]

export function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const draftCount = useDraftCount()
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      { key: '?', label: '도움말', run: () => setHelpOpen((o) => !o) },
      { key: 'Escape', label: '닫기', inInputs: true, run: () => setHelpOpen(false) },
      { key: 'n', label: '새 문제', run: () => navigate('/problems/new') },
      ...nav.map<Shortcut>((item) => ({ key: item.key, label: item.label, run: () => navigate(item.to) })),
      {
        key: '/',
        label: '검색',
        run: () => {
          if (location.pathname !== '/') navigate('/', { state: { focusSearch: true } })
          else window.dispatchEvent(new CustomEvent('reviewnotes:focus-search'))
        },
      },
      {
        key: 'e',
        label: '편집',
        run: () => {
          const m = matchPath('/problems/:id', location.pathname)
          if (m?.params.id && m.params.id !== 'new') navigate(`/problems/${m.params.id}/edit`)
        },
      },
    ],
    [navigate, location.pathname],
  )
  useShortcuts(shortcuts)

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-6 sm:px-4">
            <NavLink to="/" className="rounded-control text-[1.05rem] font-bold tracking-tight text-ink">
              오답노트
            </NavLink>
            <nav className="-mx-1 flex min-w-0 flex-1 gap-0.5 overflow-x-auto px-1 text-sm" aria-label="주요 메뉴">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cx(
                      'flex h-9 shrink-0 items-center gap-1.5 rounded-control px-2.5 font-medium sm:px-3 whitespace-nowrap transition-[background-color,color] duration-(--dur-micro)',
                      isActive ? 'bg-accent-soft text-accent-deep' : 'text-ink-2 hover:bg-paper-2',
                    )
                  }
                >
                  {item.label}
                  {item.to === '/drafts' && !!draftCount && (
                    <span className="rounded-pill bg-warn-soft px-1.5 text-[0.7rem] font-semibold text-warn tabular-nums">
                      {draftCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="키보드 단축키"
                title="키보드 단축키 (?)"
                className="hidden size-9 items-center justify-center rounded-control text-ink-2 transition-[background-color,color] duration-(--dur-micro) hover:bg-paper-2 hover:text-ink sm:flex"
              >
                <Keyboard className="size-[18px]" aria-hidden />
              </button>
              <ThemeToggle />
              <Button variant="primary" size="sm" icon={<Plus className="size-4" aria-hidden />} onClick={() => navigate('/problems/new')} className="ml-1">
                <span className="hidden sm:inline">새 문제</span>
                <span className="sr-only sm:hidden">새 문제</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <Outlet />
        </main>
        <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </ToastProvider>
  )
}
