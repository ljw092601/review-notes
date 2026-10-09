import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { NotFoundPage, RouteErrorPage } from './components/NotFoundPage'
import { ProblemListPage } from './features/problems/ProblemListPage'
import { DraftPage, ProblemDetailPage, ProblemEditPage, QuizPage, TransferPage } from './pages'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <ProblemListPage /> },
      { path: 'problems/new', element: <ProblemEditPage /> },
      { path: 'problems/:id', element: <ProblemDetailPage /> },
      { path: 'problems/:id/edit', element: <ProblemEditPage /> },
      { path: 'drafts', element: <DraftPage /> },
      { path: 'quiz', element: <QuizPage /> },
      { path: 'transfer', element: <TransferPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
