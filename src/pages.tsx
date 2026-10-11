import { Suspense, lazy, type ReactNode } from 'react'

/**
 * 라우트 단위 코드 분할. 목록(첫 화면)만 App.tsx에서 바로 import하고 나머지는 들어갈 때 받는다.
 * fallback은 null — 페이지 자체도 데이터 로딩 중엔 null을 내므로 깜빡임이 없다.
 */
const Detail = lazy(() => import('./features/problems/ProblemDetailPage').then((m) => ({ default: m.ProblemDetailPage })))
const Edit = lazy(() => import('./features/problems/ProblemEditPage').then((m) => ({ default: m.ProblemEditPage })))
const Draft = lazy(() => import('./features/problems/DraftPage').then((m) => ({ default: m.DraftPage })))
const Quiz = lazy(() => import('./features/quiz/QuizPage').then((m) => ({ default: m.QuizPage })))
const Transfer = lazy(() => import('./features/transfer/TransferPage').then((m) => ({ default: m.TransferPage })))
const Print = lazy(() => import('./features/print/PrintPage').then((m) => ({ default: m.PrintPage })))

function Loading({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>
}

export function ProblemDetailPage() {
  return (
    <Loading>
      <Detail />
    </Loading>
  )
}

export function ProblemEditPage() {
  return (
    <Loading>
      <Edit />
    </Loading>
  )
}

export function DraftPage() {
  return (
    <Loading>
      <Draft />
    </Loading>
  )
}

export function QuizPage() {
  return (
    <Loading>
      <Quiz />
    </Loading>
  )
}

export function TransferPage() {
  return (
    <Loading>
      <Transfer />
    </Loading>
  )
}

export function PrintPage() {
  return (
    <Loading>
      <Print />
    </Loading>
  )
}
