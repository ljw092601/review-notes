import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastAction, type ToastApi } from './toast-context'
import { Button } from './ui'

interface Toast {
  id: number
  message: string
  tone: 'info' | 'error'
  action?: ToastAction
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const show = useCallback<ToastApi['show']>(
    (message, options = {}) => {
      const id = Date.now() + Math.random()
      setToasts((list) => [...list, { id, message, tone: options.tone ?? 'info', action: options.action }])
      timers.current.set(id, setTimeout(() => dismiss(id), options.duration ?? (options.action ? 7000 : 4000)))
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-card border px-4 py-2.5 text-sm shadow-lift ${
              t.tone === 'error' ? 'border-error bg-error-soft text-error' : 'border-rule bg-paper text-ink'
            }`}
          >
            <span>{t.message}</span>
            {t.action && (
              <Button
                size="sm"
                variant="ghost"
                className="-mr-1 text-accent-deep"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
