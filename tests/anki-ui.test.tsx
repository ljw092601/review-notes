import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { router } from '@/App'
import { createProblem, db } from '@/db'
import type { ProblemInput } from '@/models/types'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

const base: ProblemInput = {
  certification: '정보처리기사',
  category: 'network',
  answerType: 'short',
  question: '네트워크 계층 장비는?',
  myAnswer: '',
  correctAnswer: '라우터',
  explanation: '**핵심 개념**: 라우터는 3계층, 스위치는 2계층 장비다.',
  wrongReason: '',
  status: 'done',
  tags: ['스위치'],
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await createProblem(base)
  await createProblem({ ...base, category: 'os', question: '풀이 없는 문제', correctAnswer: 'RR', explanation: '', tags: [], status: 'draft' })
})

afterEach(() => vi.restoreAllMocks())

describe('Anki 내보내기', () => {
  test('단어를 클릭해 빈칸을 끄고 켜면 수가 바뀌고 저장되며, 파일에 빈칸 텍스트가 들어간다', async () => {
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: Blob | MediaSource) => {
      blobs.push(b as Blob)
      return 'blob:anki'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const user = userEvent.setup()
    renderAt('/anki')

    const list = await screen.findByRole('list', { name: 'Anki 카드 미리보기' })
    expect(within(list).getAllByRole('listitem').length).toBe(1)
    expect(screen.getByText('빈칸 2개')).toBeInTheDocument()
    expect(screen.getByText(/풀이 없는 1개는 빠짐/)).toBeInTheDocument()

    const preview = within(list).getByRole('group', { name: '단어를 클릭하면 빈칸이 돼요' })
    await user.click(within(preview).getByText('스위치', { selector: 'mark' }))
    expect(await screen.findByText('빈칸 1개')).toBeInTheDocument()
    expect(within(preview).getByText('스위치는', { selector: 'span' })).toBeInTheDocument()

    await user.click(within(preview).getByText('2계층', { selector: 'span' }))
    expect(await screen.findByText('빈칸 2개')).toBeInTheDocument()
    expect(within(preview).getByText('2계층', { selector: 'mark' })).toBeInTheDocument()
    // 선택이 settings에 남는다
    await waitFor(async () => expect(Object.values((await db.settings.get('ankiBlanks'))?.value as Record<string, unknown[]>)[0].length).toBe(2))

    await user.click(screen.getByRole('button', { name: 'Anki 파일 받기' }))
    await waitFor(() => expect(blobs.length).toBe(1))
    const text = await blobs[0].text()
    expect(text).toContain('#separator:tab')
    expect(text).toContain('#deck:정보처리기사 오답노트')
    expect(text).toContain('{{c1::라우터}}는 3계층, 스위치는 {{c1::2계층}}')
    expect(text).toContain('<b>정답</b> 라우터')
    expect(text).toContain('네트워크 스위치\treviewnotes-')
  })

  test('자동 제안으로 되돌리기와 모두 지우기', async () => {
    const user = userEvent.setup()
    renderAt('/anki')
    const list = await screen.findByRole('list', { name: 'Anki 카드 미리보기' })
    expect(screen.queryByRole('button', { name: '자동 제안으로' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '모두 지우기' }))
    expect(await screen.findByText('빈칸 없음 — 내보내지 않음')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anki 파일 받기' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '자동 제안으로' }))
    expect(await screen.findByText('빈칸 2개')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem').length).toBe(1)
  })

  test('가져오기/내보내기 페이지의 카드에서 들어갈 수 있다', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/transfer')
    await user.click(await screen.findByRole('button', { name: '빈칸 카드 만들기' }))
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/anki'))
  })
})
