import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test } from 'vitest'
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
  question: 'OSI 3계층은?',
  myAnswer: '',
  correctAnswer: '네트워크 계층',
  explanation: '',
  wrongReason: '',
  status: 'draft',
  tags: [],
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

async function seed() {
  const first = await createProblem({ ...base, question: '첫 번째 draft 문제' })
  // createdAt이 같은 ms에 들어가지 않도록 보정
  const second = await createProblem({ ...base, question: '두 번째 draft 문제', category: 'security' })
  await db.problems.update(first.id, { createdAt: 1000 })
  await db.problems.update(second.id, { createdAt: 2000 })
  await createProblem({ ...base, question: '완료된 문제', explanation: '풀이', wrongReason: '이유', status: 'done' })
  return { first, second }
}

describe('입력 필요 화면', () => {
  test('draft만 오래된 순으로 보여주고 진행 상황을 표시한다', async () => {
    await seed()
    renderAt('/drafts')
    expect(await screen.findByText('첫 번째 draft 문제')).toBeInTheDocument()
    expect(screen.queryByText('완료된 문제')).not.toBeInTheDocument()
    expect(screen.getByText((_, el) => el?.tagName === 'P' && /^2개 중 1번째/.test(el.textContent ?? ''))).toBeInTheDocument()
  })

  test('틀린 이유·풀이를 적고 저장하면 완료가 되고 다음으로 넘어간다', async () => {
    const { first, second } = await seed()
    const user = userEvent.setup()
    renderAt('/drafts')
    await screen.findByText('첫 번째 draft 문제')
    await user.type(screen.getByRole('textbox', { name: '틀린 이유' }), '개념 혼동')
    await user.type(screen.getByRole('textbox', { name: '풀이' }), '3계층은 네트워크')
    await user.click(screen.getByRole('button', { name: '저장하고 다음' }))

    expect(await screen.findByText('두 번째 draft 문제')).toBeInTheDocument()
    expect((await db.problems.get(first.id))?.status).toBe('done')
    expect((await db.problems.get(first.id))?.wrongReason).toBe('개념 혼동')
    expect(screen.getByText((_, el) => el?.tagName === 'P' && /^2개 중 2번째/.test(el.textContent ?? ''))).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: '틀린 이유' }), '이유')
    await user.type(screen.getByRole('textbox', { name: '풀이' }), '풀이')
    await user.click(screen.getByRole('button', { name: '저장하고 다음' }))
    expect(await screen.findByText('입력 필요한 문제가 없어요 🎉')).toBeInTheDocument()
    expect((await db.problems.get(second.id))?.status).toBe('done')
  })

  test('틀린 이유만 적고 저장하면 draft로 남고 큐 뒤로 간다', async () => {
    const { first } = await seed()
    const user = userEvent.setup()
    renderAt('/drafts')
    await screen.findByText('첫 번째 draft 문제')
    await user.type(screen.getByRole('textbox', { name: '틀린 이유' }), '이유만')
    await user.click(screen.getByRole('button', { name: '저장하고 다음' }))
    expect(await screen.findByText('두 번째 draft 문제')).toBeInTheDocument()
    await waitFor(async () => expect((await db.problems.get(first.id))?.wrongReason).toBe('이유만'))
    expect((await db.problems.get(first.id))?.status).toBe('draft')
    expect(screen.getByText(/아직 입력 필요 상태예요/)).toBeInTheDocument()
  })

  test('건너뛰기는 저장하지 않고 다음으로 간다', async () => {
    const { first } = await seed()
    const user = userEvent.setup()
    renderAt('/drafts')
    await screen.findByText('첫 번째 draft 문제')
    await user.click(screen.getByRole('button', { name: '건너뛰기' }))
    expect(await screen.findByText('두 번째 draft 문제')).toBeInTheDocument()
    expect((await db.problems.get(first.id))?.status).toBe('draft')
  })

  test('정답 확신이 낮으면 경고와 정답 입력란이 열린다', async () => {
    await createProblem({ ...base, question: '확신 낮은 문제', correctAnswer: '아마 이것', answerConfidence: 'low' })
    renderAt('/drafts')
    await screen.findByText('확신 낮은 문제')
    expect(screen.getByText('Claude가 확신하지 못한 정답이에요. 확인해 주세요.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '정답' })).toHaveValue('아마 이것')
  })

  test('?id= 로 시작 문제를 지정한다', async () => {
    const { second } = await seed()
    renderAt(`/drafts?id=${second.id}`)
    expect(await screen.findByText('두 번째 draft 문제')).toBeInTheDocument()
    expect(screen.queryByText('첫 번째 draft 문제')).not.toBeInTheDocument()
  })

  test('상세 화면에서 draft면 채우기 버튼이 보인다', async () => {
    const { first } = await seed()
    const memoryRouter = renderAt(`/problems/${first.id}`)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /입력 필요 화면에서 채우기/ }))
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/drafts'))
    expect(memoryRouter.state.location.search).toBe(`?id=${first.id}`)
  })
})
