import { Plus } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useDraftCount } from '@/db'
import { ToastProvider } from './toast'
import { Button } from './ui'
import { cx } from '@/lib/cx'

const nav = [
  { to: '/', label: '문제' },
  { to: '/drafts', label: '입력 필요' },
  { to: '/quiz', label: '복습' },
  { to: '/transfer', label: '가져오기' },
]

export function Layout() {
  const navigate = useNavigate()
  const draftCount = useDraftCount()

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
            <Button variant="primary" size="sm" icon={<Plus className="size-4" aria-hidden />} onClick={() => navigate('/problems/new')}>
              <span className="hidden sm:inline">새 문제</span>
              <span className="sr-only sm:hidden">새 문제</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </ToastProvider>
  )
}
