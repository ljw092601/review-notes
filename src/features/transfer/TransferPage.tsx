import { usePageTitle } from '@/lib/usePageTitle'
import { CategoryManager } from './CategoryManager'
import { ExportCard } from './ExportCard'
import { ImportCard } from './ImportCard'

export function TransferPage() {
  usePageTitle('가져오기 / 내보내기')
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">가져오기 / 내보내기</h1>
      <p className="mt-1 text-sm text-muted">Claude가 만든 문제 파일을 불러오거나, 전체 데이터를 백업하고, 문제 유형을 손봐요.</p>
      <div className="mt-6 flex flex-col gap-5">
        <ImportCard />
        <ExportCard />
        <CategoryManager />
      </div>
    </div>
  )
}
