import { ShieldAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { onDataChanged, useSetting, writeBackup } from '@/db'
import { queryPermission, requestPermission } from '@/lib/fsAccess'
import { useToast } from './toast-context'
import { Button } from './ui'

const DEBOUNCE_MS = 3000
const STARTUP_DELAY_MS = 1000

/**
 * 자동 백업 담당. 백업 폴더가 정해져 있으면 데이터가 바뀔 때마다 3초 뒤에 폴더에 쓴다.
 * 권한이 풀려 있으면 헤더 아래에 배너를 띄워 사용자 클릭으로 다시 받는다.
 */
export function BackupAgent() {
  const toast = useToast()
  const dir = useSetting('backupDir')
  const [needsPermission, setNeedsPermission] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [granting, setGranting] = useState(false)
  const running = useRef(false)
  const dirty = useRef(false)
  const lastError = useRef<string | null>(null)
  const toastRef = useRef(toast)
  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  useEffect(() => {
    if (!dir) {
      // oxlint-disable-next-line react/set-state-in-effect
      setNeedsPermission(false)
      return
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    let disposed = false

    async function run() {
      if (running.current) {
        dirty.current = true
        return
      }
      running.current = true
      try {
        do {
          dirty.current = false
          if ((await queryPermission(dir!)) !== 'granted') {
            if (!disposed) setNeedsPermission(true)
            return
          }
          if (!disposed) setNeedsPermission(false)
          await writeBackup(dir!)
          lastError.current = null
        } while (dirty.current && !disposed)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '자동 백업에 실패했어요'
        if (lastError.current !== msg) {
          lastError.current = msg
          toastRef.current.show(`자동 백업 실패: ${msg}`, { tone: 'error' })
        }
      } finally {
        running.current = false
      }
    }

    const schedule = (delay: number) => {
      clearTimeout(timer)
      timer = setTimeout(() => void run(), delay)
    }

    schedule(STARTUP_DELAY_MS)
    const unsubscribe = onDataChanged(() => schedule(DEBOUNCE_MS))
    return () => {
      disposed = true
      clearTimeout(timer)
      unsubscribe()
    }
  }, [dir])

  async function grant() {
    if (!dir) return
    setGranting(true)
    try {
      const p = await requestPermission(dir)
      if (p === 'granted') {
        setNeedsPermission(false)
        await writeBackup(dir)
        lastError.current = null
      } else {
        toast.show('권한이 허용되지 않았어요. 가져오기 화면의 자동 백업에서 다시 시도할 수 있어요', { tone: 'error' })
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '자동 백업에 실패했어요', { tone: 'error' })
    } finally {
      setGranting(false)
    }
  }

  if (!dir || !needsPermission || dismissed) return null

  return (
    <div role="status" className="border-b border-warn/30 bg-warn-soft">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm text-warn">
        <ShieldAlert className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          자동 백업 폴더 ‘{dir.name}’ 권한이 필요해요. 허용할 때까지 백업이 멈춰 있어요.
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="primary" onClick={() => void grant()} loading={granting}>
            허용
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            나중에
          </Button>
        </div>
      </div>
    </div>
  )
}
