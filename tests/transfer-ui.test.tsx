import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { router } from '@/App'
import { createProblem, db, listCategories } from '@/db'
import type { ImportFileInput } from '@/models/schemas'
import { backupFilename } from '@/features/transfer/download'

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

function claudeFile(overrides: Partial<ImportFileInput['problems'][number]> = {}): ImportFileInput {
  return {
    version: 1,
    problems: [
      {
        certification: '정보처리기사',
        category: 'design',
        source: '2024년 2회 기출 3번',
        answerType: 'short',
        question: '클래스 간 관계를 나타내는 UML 다이어그램은?',
        myAnswer: '',
        correctAnswer: '클래스 다이어그램',
        answerConfidence: 'low',
        tags: ['UML'],
        ...overrides,
      },
    ],
  }
}

function jsonFile(content: unknown, name = 'out.json') {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return new File([text], name, { type: 'application/json' })
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('가져오기', () => {
  test('미리보기에 유형·정답 확인 배지가 보이고 가져오면 입력 필요 화면으로 간다', async () => {
    const user = userEvent.setup()
    const memoryRouter = renderAt('/transfer')
    const input = await screen.findByLabelText('가져올 JSON 파일')
    await user.upload(input, jsonFile(claudeFile()))

    const list = await screen.findByRole('list', { name: '가져올 문제' })
    expect(within(list).getByText('소프트웨어 설계')).toBeInTheDocument()
    expect(within(list).getByText('정답 확인 필요')).toBeInTheDocument()
    expect(within(list).getByText('클래스 간 관계를 나타내는 UML 다이어그램은?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '1개 가져오기' }))
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/drafts'))
    const saved = await db.problems.toArray()
    expect(saved.length).toBe(1)
    expect(saved[0].status).toBe('draft')
  })

  test('이미 있는 문제는 중복 표시되고 기본으로 건너뛴다', async () => {
    await createProblem({
      certification: '정보처리기사',
      category: 'design',
      source: '2024년 2회 기출 3번',
      answerType: 'short',
      question: '다른 본문',
      myAnswer: '',
      correctAnswer: '',
      explanation: '',
      wrongReason: '',
      status: 'draft',
      tags: [],
    })
    const user = userEvent.setup()
    renderAt('/transfer')
    await user.upload(await screen.findByLabelText('가져올 JSON 파일'), jsonFile(claudeFile()))
    expect(await screen.findByText('이미 있음')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0개 가져오기' })).toBeDisabled()
    await user.click(screen.getByRole('radio', { name: /따로 추가/ }))
    expect(screen.getByRole('button', { name: '1개 가져오기' })).toBeEnabled()
  })

  test('덮어쓰기를 고르면 기존 문제의 풀이·정답이 파일 내용으로 바뀌고 틀린 이유는 남는다', async () => {
    const existing = await createProblem({
      certification: '정보처리기사',
      category: 'design',
      source: '2024년 2회 기출 3번',
      answerType: 'short',
      question: '다른 본문',
      myAnswer: '',
      correctAnswer: '옛 정답',
      explanation: '옛 풀이',
      wrongReason: '내가 적은 이유',
      status: 'done',
      tags: [],
    })
    const user = userEvent.setup()
    const memoryRouter = renderAt('/transfer')
    await user.upload(
      await screen.findByLabelText('가져올 JSON 파일'),
      jsonFile(claudeFile({ explanation: '**핵심 개념**: 새 풀이' })),
    )
    await screen.findByText('이미 있음')
    await user.click(screen.getByRole('radio', { name: /덮어쓰기/ }))
    expect(within(screen.getByRole('list', { name: '가져올 문제' })).getByText('덮어쓰기')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '1개 가져오기 (1개 덮어쓰기)' }))
    await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/'))
    const saved = await db.problems.toArray()
    expect(saved.length).toBe(1)
    expect(saved[0].id).toBe(existing.id)
    expect(saved[0].explanation).toBe('**핵심 개념**: 새 풀이')
    expect(saved[0].correctAnswer).toBe('클래스 다이어그램')
    expect(saved[0].wrongReason).toBe('내가 적은 이유')
    expect(saved[0].status).toBe('done')
  })

  test('형식이 틀린 파일은 오류 목록을 인라인으로 보여준다', async () => {
    const user = userEvent.setup()
    renderAt('/transfer')
    const input = await screen.findByLabelText('가져올 JSON 파일')
    await user.upload(input, jsonFile({ version: 2, problems: 'x' }, 'bad.json'))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('bad.json')
    expect(alert).toHaveTextContent('version')
    expect(await db.problems.count()).toBe(0)

    await user.upload(screen.getByLabelText('가져올 JSON 파일'), jsonFile('{not json', 'broken.json'))
    expect(await screen.findByText('JSON 문법이 잘못되었어요')).toBeInTheDocument()
  })
})

describe('내보내기', () => {
  test('백업 버튼이 다운로드 링크를 만든다', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:review-notes')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe(backupFilename())
      expect(this.href).toBe('blob:review-notes')
    })

    const user = userEvent.setup()
    renderAt('/transfer')
    await user.click(await screen.findByRole('button', { name: '전체 백업 내보내기' }))
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/json')
  })

  test('백업 파일 이름은 날짜가 들어간다', () => {
    expect(backupFilename(new Date(2026, 9, 9))).toBe('review-notes-2026-10-09.json')
  })
})

describe('문제 유형 관리', () => {
  test('유형을 추가하고 이름을 바꾼다', async () => {
    const user = userEvent.setup()
    renderAt('/transfer')
    const list = await screen.findByRole('list', { name: '문제 유형 목록' })
    expect(within(list).getAllByRole('listitem').length).toBe(13)

    await user.type(screen.getByLabelText(/새 유형 이름/), '클라우드')
    await user.click(screen.getByRole('button', { name: '추가' }))
    await waitFor(() => expect(within(list).getByText('클라우드')).toBeInTheDocument())

    await user.click(within(list).getByRole('button', { name: '클라우드 이름 바꾸기' }))
    const nameInput = within(list).getByLabelText(/^이름/)
    await user.clear(nameInput)
    await user.type(nameInput, '클라우드·가상화')
    await user.click(within(list).getByRole('button', { name: '저장' }))
    await waitFor(() => expect(within(list).getByText('클라우드·가상화')).toBeInTheDocument())

    const categories = await listCategories()
    expect(categories.at(-1)).toMatchObject({ name: '클라우드·가상화', order: 13 })
  })

  test('중복 이름은 오류로 막고 기타는 지울 수 없다', async () => {
    const user = userEvent.setup()
    renderAt('/transfer')
    await screen.findByRole('list', { name: '문제 유형 목록' })
    await user.type(screen.getByLabelText(/새 유형 이름/), '보안')
    await user.click(screen.getByRole('button', { name: '추가' }))
    expect(await screen.findByText('이미 있는 유형입니다: 보안')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '기타 유형은 지울 수 없어요' })).toBeDisabled()
  })
})
