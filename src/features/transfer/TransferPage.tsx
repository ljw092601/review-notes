import { usePageTitle } from '@/lib/usePageTitle'
import { AnkiCard } from './AnkiCard'
import { CategoryManager } from './CategoryManager'
import { BackupCard } from './BackupCard'
import { ExportCard } from './ExportCard'
import { ImportCard } from './ImportCard'

export function TransferPage() {
  usePageTitle('가져오기 / 내보내기')
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">가져오기 / 내보내기</h1>
      <p className="mt-1 text-sm text-muted">Claude가 만든 문제 파일을 불러오고, PC 폴더에 자동 백업을 걸어 두거나 전체 데이터를 파일로 받고, 문제 유형을 손봐요.</p>
      <div className="mt-6 flex flex-col gap-5">
        <ImportCard />
        <BackupCard />
        <ExportCard />
        <AnkiCard />
        <CategoryManager />
      </div>
    </div>
  )
}
