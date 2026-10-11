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
  question: 'OSI 3계층의 이름은?',
  myAnswer: '전송 계층',
  correctAnswer: '네트워크 계층',
  explanation: '**핵심 개념**: 장비는 계층으로 구분한다',
  wrongReason: '계층 순서를 거꾸로 외움',
  status: 'done',
  tags: ['OSI'],
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  await createProblem(base)
  await createProblem({ ...base, category: 'os', question: 'FCFS의 선점형 짝은?', myAnswer: '', correctAnswer: 'RR', explanation: '', wrongReason: '', status: 'draft', tags: [] })
  await createProblem({
    ...base,
    category: 'design',
    answerType: 'choice',
    question: '구조 패턴이 아닌 것은?',
    choices: ['Bridge', 'Observer', 'Proxy'],
    myAnswer: '',
    correctAnswer: 'Observer',
    explanation: '**핵심 개념**: Observer는 행위 패턴',
    wrongReason: '',
    status: 'draft',
    tags: ['디자인 패턴'],
  })
})

afterEach(() => vi.restoreAllMocks())

describe('인쇄', () => {
  test('오답노트 형식: 문제·정답·풀이·틀린 이유가 모두 나오고, 인쇄 버튼이 window.print를 부른다', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    renderAt('/print')
    const list = await screen.findByRole('list', { name: '인쇄할 문제' })
    expect(list.children.length).toBe(3)
    expect(within(list).getByText('네트워크 계층')).toBeInTheDocument()
    expect(within(list).getByText('계층 순서를 거꾸로 외움')).toBeInTheDocument()
    expect(within(list).queryByText('전송 계층')).not.toBeInTheDocument()
    expect(within(list).getByText('Bridge')).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: '인쇄 / PDF 저장' }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  test('내 답 체크와 틀린 이유 해제가 URL과 본문에 반영된다', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/print')
    const list = await screen.findByRole('list', { name: '인쇄할 문제' })
    await user.click(screen.getByLabelText('내 답'))
    expect(await within(list).findByText('전송 계층')).toBeInTheDocument()
    await user.click(screen.getByLabelText('틀린 이유'))
    await waitFor(() => expect(within(list).queryByText('계층 순서를 거꾸로 외움')).not.toBeInTheDocument())
    expect(memoryRouter.state.location.search).toContain('my=1')
    expect(memoryRouter.state.location.search).toContain('reason=0')
  })

  test('개념 정리 형식: 풀이 있는 문제만 유형별로 묶는다', async () => {
    const user = userEvent.setup()
    renderAt('/print')
    await screen.findByRole('list', { name: '인쇄할 문제' })
    await user.click(screen.getByRole('radio', { name: '개념 정리' }))
    expect(await screen.findByText('(풀이가 비어 있는 1문제는 빠짐)')).toBeInTheDocument()
    const network = screen.getByRole('region', { name: '네트워크' })
    expect(within(network).getByText(/장비는 계층으로 구분한다/)).toBeInTheDocument()
    const design = screen.getByRole('region', { name: '소프트웨어 설계' })
    expect(within(design).getByText(/Observer는 행위 패턴/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '운영체제' })).not.toBeInTheDocument()
    expect(screen.queryByText('OSI 3계층의 이름은?')).not.toBeInTheDocument()
  })

  test('문제만 형식: 본문에는 정답이 없고 맨 뒤 정답표에만 있다', async () => {
    renderAt('/print?mode=quiz')
    const list = await screen.findByRole('list', { name: '인쇄할 문제' })
    expect(within(list).queryByText('네트워크 계층')).not.toBeInTheDocument()
    expect(within(list).queryByText(/장비는 계층으로 구분한다/)).not.toBeInTheDocument()
    const answers = screen.getByRole('region', { name: '정답' })
    expect(within(answers).getAllByRole('row').length).toBe(3)
    expect(within(answers).getByText('네트워크 계층')).toBeInTheDocument()
  })

  test('목록 필터(유형)가 그대로 적용되고 인쇄 화면에서도 바꿀 수 있다', async () => {
    const user = userEvent.setup()
    renderAt('/print?category=os')
    const list = await screen.findByRole('list', { name: '인쇄할 문제' })
    expect(list.children.length).toBe(1)
    expect(within(list).getByText('FCFS의 선점형 짝은?')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('유형'), '')
    await waitFor(() => expect(screen.getByRole('list', { name: '인쇄할 문제' }).children.length).toBe(3))
  })

  test('문제 목록의 인쇄 버튼은 지금 필터를 들고 인쇄 화면으로 간다', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/?category=network')
    await user.click(await screen.findByRole('button', { name: '인쇄' }))
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/print'))
    expect(memoryRouter.state.location.search).toBe('?category=network')
  })
})
