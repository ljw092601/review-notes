import { useNavigate, useRouteError } from 'react-router-dom'
import { usePageTitle } from '@/lib/usePageTitle'
import { Button, Card, EmptyState } from './ui'

export function NotFoundPage() {
  const navigate = useNavigate()
  usePageTitle('페이지 없음')
  return (
    <EmptyState
      title="페이지를 찾을 수 없어요"
      body="주소가 잘못되었거나 옮겨진 페이지예요."
      action={<Button onClick={() => navigate('/')}>문제 목록으로</Button>}
    />
  )
}

/** 라우트 안에서 렌더 오류가 났을 때. 데이터는 IndexedDB에 있으니 새로고침이면 대부분 돌아온다. */
export function RouteErrorPage() {
  const error = useRouteError()
  const message = error instanceof Error ? error.message : String(error)
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Card className="px-6 py-8 text-center">
        <p className="text-base font-semibold text-ink">문제가 생겼어요</p>
        <p className="mt-1.5 text-sm text-muted">화면을 그리다가 오류가 났어요. 기록한 데이터는 브라우저에 그대로 있어요.</p>
        <pre className="mx-auto mt-4 max-w-prose overflow-x-auto rounded-control bg-paper-2 px-3 py-2 text-left font-mono text-xs text-ink-2">{message}</pre>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={() => window.location.reload()}>
            새로고침
          </Button>
          <Button onClick={() => window.location.assign('/')}>문제 목록으로</Button>
        </div>
      </Card>
    </main>
  )
}
