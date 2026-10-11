import { FolderOpen, FolderSync, RotateCcw, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge, Button, Card, SectionTitle } from '@/components/ui'
import { useToast } from '@/components/toast-context'
import {
  importProblems,
  previewImport,
  readBackupFromFolder,
  removeSetting,
  setSetting,
  useSetting,
  writeBackup,
  type ImportPreview,
} from '@/db'
import { isFsAccessSupported, pickDirectory, queryPermission, requestPermission, type PermissionState } from '@/lib/fsAccess'
import { formatDateTime, relativeDate } from '@/lib/text'

type RestoreState = { kind: 'idle' } | { kind: 'reading' } | { kind: 'confirm'; preview: ImportPreview; missingImages: number } | { kind: 'running' }

export function BackupCard() {
  const toast = useToast()
  const dir = useSetting('backupDir')
  const lastAt = useSetting('backupLastAt')
  const [permission, setPermission] = useState<PermissionState | null>(null)
  const [busy, setBusy] = useState<'backup' | 'pick' | 'permission' | null>(null)
  const [restore, setRestore] = useState<RestoreState>({ kind: 'idle' })
  const supported = isFsAccessSupported()

  // 폴더가 정해져 있으면 권한 상태를 조회해 둔다(묻지는 않는다)
  useEffect(() => {
    if (!dir) return
    let cancelled = false
    void queryPermission(dir).then((p) => {
      if (!cancelled) setPermission(p)
    })
    return () => {
      cancelled = true
    }
  }, [dir])

  function fail(e: unknown, fallback: string) {
    toast.show(e instanceof Error ? e.message : fallback, { tone: 'error' })
  }

  async function backupTo(handle: FileSystemDirectoryHandle) {
    const report = await writeBackup(handle)
    setPermission('granted')
    if (report.skipped) {
      toast.show(report.skipped, { duration: 8000 })
      return
    }
    toast.show(`${handle.name}에 백업했어요 (문제 ${report.problems}개)`)
    if (report.warnings[0]) toast.show(report.warnings[0])
  }

  async function pick() {
    setBusy('pick')
    try {
      const handle = await pickDirectory()
      if (!handle) return
      await setSetting('backupDir', handle)
      await backupTo(handle)
    } catch (e) {
      fail(e, '폴더를 선택하지 못했어요')
    } finally {
      setBusy(null)
    }
  }

  async function backupNow() {
    if (!dir) return
    setBusy('backup')
    try {
      const p = await requestPermission(dir)
      setPermission(p)
      if (p !== 'granted') {
        toast.show('폴더 쓰기 권한이 없어 백업하지 못했어요', { tone: 'error' })
        return
      }
      await backupTo(dir)
    } catch (e) {
      fail(e, '백업에 실패했어요')
    } finally {
      setBusy(null)
    }
  }

  async function grant() {
    if (!dir) return
    setBusy('permission')
    try {
      const p = await requestPermission(dir)
      setPermission(p)
      if (p === 'granted') await backupTo(dir)
      else toast.show('권한이 허용되지 않았어요', { tone: 'error' })
    } catch (e) {
      fail(e, '권한을 요청하지 못했어요')
    } finally {
      setBusy(null)
    }
  }

  async function turnOff() {
    await removeSetting('backupDir')
    await removeSetting('backupLastAt')
    setRestore({ kind: 'idle' })
    toast.show('자동 백업을 껐어요. 폴더의 파일은 그대로 있어요')
  }

  async function prepareRestore() {
    if (!dir) return
    setRestore({ kind: 'reading' })
    try {
      const p = await requestPermission(dir, 'read')
      if (p !== 'granted') {
        toast.show('폴더 읽기 권한이 없어요', { tone: 'error' })
        setRestore({ kind: 'idle' })
        return
      }
      const { json, missingImages } = await readBackupFromFolder(dir)
      const preview = await previewImport(json)
      setRestore({ kind: 'confirm', preview, missingImages })
    } catch (e) {
      fail(e, '폴더를 읽지 못했어요')
      setRestore({ kind: 'idle' })
    }
  }

  async function runRestore() {
    if (restore.kind !== 'confirm') return
    const { preview, missingImages } = restore
    setRestore({ kind: 'running' })
    try {
      const result = await importProblems(preview, { skipDuplicates: true })
      let msg = `${result.added}개 복원했어요`
      if (result.skipped > 0) msg += ` (${result.skipped}개는 이미 있어 건너뜀)`
      if (missingImages > 0) msg += ` · 사진 ${missingImages}장은 파일이 없어 빠졌어요`
      toast.show(msg)
    } catch (e) {
      fail(e, '복원에 실패했어요')
    } finally {
      setRestore({ kind: 'idle' })
    }
  }

  return (
    <Card as="section" className="p-5 sm:p-6">
      <SectionTitle>자동 백업</SectionTitle>

      {!supported ? (
        <p className="mt-1.5 text-sm text-muted">
          이 브라우저는 폴더에 직접 저장하는 기능을 지원하지 않아요(Firefox·Safari). Chrome이나 Edge에서 쓰거나, 아래 전체 백업 버튼으로
          파일을 받아 두세요.
        </p>
      ) : dir === undefined ? null : dir === null ? (
        <>
          <p className="mt-1.5 text-sm text-muted">
            폴더를 한 번 고르면 문제를 저장할 때마다 그 폴더에 review-notes.json과 사진이 자동으로 갱신돼요. 하루 단위 스냅샷은 history/에
            30일치 보관해요.
          </p>
          <div className="mt-4">
            <Button variant="primary" onClick={() => void pick()} loading={busy === 'pick'} icon={<FolderOpen className="size-4" aria-hidden />}>
              백업 폴더 선택
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-ink">
              <FolderOpen className="size-4 text-neutral" aria-hidden />
              {dir.name}
            </span>
            <span className="text-muted">
              마지막 백업{' '}
              {lastAt ? (
                <time dateTime={new Date(lastAt).toISOString()} title={formatDateTime(lastAt)} className="text-ink">
                  {relativeDate(lastAt)}
                </time>
              ) : (
                <span className="text-ink">아직 없음</span>
              )}
            </span>
            {permission && permission !== 'granted' && (
              <Badge tone="warn" className="gap-1">
                <ShieldAlert className="size-3" aria-hidden />
                권한 필요
              </Badge>
            )}
          </div>
          <p className="mt-2 text-xs text-neutral">
            문제를 저장할 때마다 review-notes.json과 images/ 폴더가 갱신되고, 날짜가 바뀌면 전날 상태가 history/에 남아요(30일치).
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {permission && permission !== 'granted' ? (
              <Button variant="primary" onClick={() => void grant()} loading={busy === 'permission'} icon={<ShieldAlert className="size-4" aria-hidden />}>
                권한 허용
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void backupNow()} loading={busy === 'backup'} icon={<FolderSync className="size-4" aria-hidden />}>
                지금 백업
              </Button>
            )}
            <Button
              onClick={() => void prepareRestore()}
              loading={restore.kind === 'reading'}
              disabled={restore.kind !== 'idle' && restore.kind !== 'reading'}
              icon={<RotateCcw className="size-4" aria-hidden />}
            >
              폴더에서 복원
            </Button>
            <Button variant="ghost" onClick={() => void pick()} loading={busy === 'pick'}>
              폴더 바꾸기
            </Button>
            <Button variant="ghost" onClick={() => void turnOff()}>
              자동 백업 끄기
            </Button>
          </div>

          {(restore.kind === 'confirm' || restore.kind === 'running') && restore.kind === 'confirm' && (
            <RestoreConfirm preview={restore.preview} missingImages={restore.missingImages} onRun={() => void runRestore()} onCancel={() => setRestore({ kind: 'idle' })} />
          )}
          {restore.kind === 'running' && <p className="mt-3 text-sm text-muted">복원하는 중…</p>}
        </>
      )}
    </Card>
  )
}

function RestoreConfirm({
  preview,
  missingImages,
  onRun,
  onCancel,
}: {
  preview: ImportPreview
  missingImages: number
  onRun: () => void
  onCancel: () => void
}) {
  const total = preview.items.length
  const fresh = preview.items.filter((it) => !it.duplicateOf).length
  return (
    <div className="mt-4 rounded-control border border-rule bg-paper-2/60 px-4 py-3 text-sm" role="status">
      <p className="text-ink">
        폴더의 문제 <span className="font-medium tabular-nums">{total}</span>개 중 앱에 없는{' '}
        <span className="font-medium tabular-nums">{fresh}</span>개를 가져올게요.
        {total - fresh > 0 && <span className="text-muted"> 나머지는 이미 있어 건너뛰어요.</span>}
        {missingImages > 0 && (
          <span className="text-warn"> 사진 {missingImages}장은 파일이 없어 빠져요.</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={onRun} disabled={fresh === 0}>
          복원
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </div>
    </div>
  )
}
