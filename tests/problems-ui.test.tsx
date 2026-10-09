import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test } from 'vitest'
import { router } from '@/App'
import { createProblem, db } from '@/db'
import { excerpt } from '@/lib/text'
import { deriveStatus, validate, toFormValues } from '@/features/problems/form'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('문제 목록', () => {
  test('비어 있으면 안내가 보인다', async () => {
    renderAt('/')
    expect(await screen.findByText('아직 기록한 문제가 없어요')).toBeInTheDocument()
  })

  test('문제 카드에 유형·요약·태그가 보인다', async () => {
    await createProblem({
      certification: '정보처리기사',
      category: 'security',
      answerType: 'short',
      question: '# 문제\n**AES**의 키 길이는?',
      myAnswer: '',
      correctAnswer: '128/192/256',
      explanation: '',
      wrongReason: '',
      status: 'draft',
      tags: ['암호화'],
    })
    renderAt('/')
    expect(await screen.findByText('문제 AES의 키 길이는?')).toBeInTheDocument()
    expect(screen.getByText('보안')).toBeInTheDocument()
    expect(screen.getAllByText('입력 필요').length).toBeGreaterThanOrEqual(2) // 메뉴 + 카드 배지
    expect(screen.getByText('#암호화')).toBeInTheDocument()
  })
})

describe('문제 상세', () => {
  test('문제·정답·빈 풀이 안내를 보여준다', async () => {
    const p = await createProblem({
      certification: '정보처리기사',
      category: 'network',
      answerType: 'short',
      question: 'OSI 3계층은?',
      myAnswer: '전송 계층',
      correctAnswer: '네트워크 계층',
      explanation: '',
      wrongReason: '',
      status: 'draft',
      tags: [],
    })
    renderAt(`/problems/${p.id}`)
    expect(await screen.findByText('OSI 3계층은?')).toBeInTheDocument()
    expect(screen.getByText('네트워크 계층')).toBeInTheDocument()
    expect(screen.getByText('전송 계층')).toBeInTheDocument()
    expect(screen.getByText(/아직 풀이를 적지 않았어요/)).toBeInTheDocument()
    expect(screen.getByText('아직 다시 풀어본 적이 없어요.')).toBeInTheDocument()
  })

  test('없는 문제는 안내를 보여준다', async () => {
    renderAt('/problems/nope')
    expect(await screen.findByText('문제를 찾을 수 없어요')).toBeInTheDocument()
  })
})

describe('문제 작성', () => {
  test('문제 없이 저장하면 오류가 보이고 저장되지 않는다', async () => {
    const user = userEvent.setup()
    renderAt('/problems/new')
    const submit = await screen.findByRole('button', { name: '기록하기' })
    await user.click(submit)
    expect(await screen.findByText('문제를 입력하세요')).toBeInTheDocument()
    expect(await db.problems.count()).toBe(0)
  })

  test('문제를 입력하고 저장하면 상세로 이동한다', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/problems/new')
    await user.type(await screen.findByRole('textbox', { name: /^문제\s*\*?$/ }), '정규화 2NF 조건은?')
    await user.click(screen.getByRole('button', { name: '기록하기' }))
    await waitFor(async () => expect(await db.problems.count()).toBe(1))
    const [saved] = await db.problems.toArray()
    expect(saved.category).toBe('programming')
    expect(saved.status).toBe('draft')
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe(`/problems/${saved.id}`))
  })
})

describe('폼 유틸', () => {
  test('풀이와 틀린 이유를 둘 다 적어야 완료', () => {
    const v = toFormValues()
    expect(deriveStatus(v)).toBe('draft')
    expect(deriveStatus({ ...v, explanation: 'a', wrongReason: '' })).toBe('draft')
    expect(deriveStatus({ ...v, explanation: 'a', wrongReason: 'b' })).toBe('done')
  })

  test('검증은 필드별 메시지를 돌려준다', () => {
    const errors = validate({ ...toFormValues(), category: '' })
    expect(errors.question).toBe('문제를 입력하세요')
    expect(errors.category).toBe('문제 유형을 선택하세요')
  })

  test('요약은 마크다운 기호를 걷어낸다', () => {
    expect(excerpt('# 제목\n- **굵게** `code`\n```js\nx\n```')).toBe('제목 굵게 code [코드]')
  })
})
