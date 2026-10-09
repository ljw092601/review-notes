import { createBrowserRouter } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProblemListPage } from './features/problems/ProblemListPage'
import { ProblemDetailPage } from './features/problems/ProblemDetailPage'
import { ProblemEditPage } from './features/problems/ProblemEditPage'
import { DraftPage } from './features/problems/DraftPage'
import { QuizPage } from './features/quiz/QuizPage'
import { TransferPage } from './features/transfer/TransferPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <ProblemListPage /> },
      { path: 'problems/new', element: <ProblemEditPage /> },
      { path: 'problems/:id', element: <ProblemDetailPage /> },
      { path: 'problems/:id/edit', element: <ProblemEditPage /> },
      { path: 'drafts', element: <DraftPage /> },
      { path: 'quiz', element: <QuizPage /> },
      { path: 'transfer', element: <TransferPage /> },
    ],
  },
])
