import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test } from 'vitest'
import { router } from '@/App'
import { db } from '@/db'
import { THEME_KEY, applyTheme, getPreference, nextPreference, setPreference } from '@/lib/theme'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.removeItem(THEME_KEY)
  applyTheme('system')
})

describe('테마', () => {
  test('기본은 시스템, 저장값이 있으면 그걸 따르고 data-theme가 확정값이 된다', () => {
    expect(getPreference()).toBe('system')
    expect(['light', 'dark']).toContain(document.documentElement.dataset.theme)
    setPreference('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    setPreference('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(nextPreference('system')).toBe('light')
    expect(nextPreference('dark')).toBe('system')
  })

  test('헤더 버튼을 누르면 시스템 → 밝게 → 어둡게로 돈다', async () => {
    const user = userEvent.setup()
    renderAt('/')
    const btn = await screen.findByRole('button', { name: /^테마: 시스템/ })
    await user.click(btn)
    expect(document.documentElement.dataset.theme).toBe('light')
    await user.click(screen.getByRole('button', { name: /^테마: 밝은/ }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: /^테마: 어두운/ })).toBeInTheDocument()
  })
})

describe('단축키', () => {
  test('n은 새 문제, ?는 도움말, Esc는 닫기', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/')
    await screen.findByRole('heading', { name: '문제' })
    await user.keyboard('?')
    expect(await screen.findByRole('dialog', { name: '키보드 단축키' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.keyboard('n')
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/problems/new'))
  })

  test('입력란에 커서가 있으면 글자 단축키가 꺼진다', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/problems/new')
    const box = await screen.findByRole('textbox', { name: /^문제\s*\*?$/ })
    await user.click(box)
    await user.keyboard('n')
    expect(box).toHaveValue('n')
    expect(memoryRouter.state.location.pathname).toBe('/problems/new')
  })

  test('다른 화면에서 /를 누르면 목록 검색창으로 간다', async () => {
    const user = userEvent.setup()
    await db.problems.add({
      id: 'p1',
      certification: '정보처리기사',
      category: 'etc',
      answerType: 'short',
      question: '아무 문제',
      myAnswer: '',
      correctAnswer: '',
      explanation: '',
      wrongReason: '',
      status: 'draft',
      tags: [],
      createdAt: 1,
      updatedAt: 1,
    })
    const memoryRouter = renderAt('/quiz')
    await screen.findByRole('heading', { name: '복습' })
    await user.keyboard('/')
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/'))
    await waitFor(() => expect(screen.getByLabelText('검색')).toHaveFocus())
  })
})
