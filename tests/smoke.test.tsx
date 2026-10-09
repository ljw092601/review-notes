import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { router } from '@/App'

test('홈 라우트가 문제 목록을 렌더링한다', async () => {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: ['/'] })
  render(<RouterProvider router={memoryRouter} />)
  expect(await screen.findByRole('heading', { name: '문제' })).toBeInTheDocument()
})
