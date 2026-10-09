import { Download } from 'lucide-react'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button, Card, SectionTitle } from '@/components/ui'
import { useToast } from '@/components/toast-context'
import { db, exportAll } from '@/db'
import { backupFilename, downloadJson } from './download'

export function ExportCard() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const counts = useLiveQuery(
    async () => ({
      problems: await db.problems.count(),
      attempts: await db.attempts.count(),
      images: await db.images.count(),
    }),
    [],
  )

  async function run() {
    setBusy(true)
    try {
      const file = await exportAll()
      downloadJson(backupFilename(), file)
      toast.show(`문제 ${file.problems.length}개를 내보냈어요`)
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '내보내기에 실패했어요', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card as="section" className="p-5 sm:p-6">
      <SectionTitle>내보내기</SectionTitle>
      <p className="mt-1.5 text-sm text-muted">
        모든 문제·복습 기록·사진을 JSON 한 파일로 저장해요. 브라우저 데이터를 지우기 전이나 다른 PC로 옮길 때 쓰세요.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="primary" onClick={() => void run()} loading={busy} icon={<Download className="size-4" aria-hidden />}>
          전체 백업 내보내기
        </Button>
        {counts && (
          <p className="text-sm text-muted">
            문제 <span className="tabular-nums">{counts.problems}</span>개 · 복습 기록 <span className="tabular-nums">{counts.attempts}</span>개 · 사진{' '}
            <span className="tabular-nums">{counts.images}</span>장
          </p>
        )}
      </div>
    </Card>
  )
}
