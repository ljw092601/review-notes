import 'fake-indexeddb/auto'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { ToastProvider } from '@/components/toast'
import { db, listExamResults } from '@/db'
import { ExamListPage } from '@/features/exams/ExamListPage'
import { ExamSession } from '@/features/exams/ExamPage'
import { buildExam } from '@/features/exams/parse'

const exam = buildExam(
  2024,
  1,
  `# 2024년 1회
## 1번 <sub>(난이도 하)</sub>

OSI 3계층의 이름을 쓰시오.

---

## 2번 <sub>(난이도 중 · 기출변형)</sub>

TCP의 연결 설정 과정을 쓰시오.
`,
  `## 1번
**유형**: network
**정답**: 네트워크 계층

## 2번
**유형**: network
**정답**: 3-way handshake
> 비고: 3방향 핸드셰이크도 정답
`,
)

function renderWith(ui: ReactNode) {
  render(
    <MemoryRouter>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(async () => {
  await db.delete()
  await db.open()
  localStorage.clear()
  window.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('기출 풀기', () => {
  test('답 쓰기 → 채점 → 결과 저장 → 오답노트에 넣기', async () => {
    const user = userEvent.setup()
    renderWith(<ExamSession exam={exam} imageUrls={new Map()} />)

    expect(screen.getByRole('heading', { name: '2024년 1회 정보처리기사 실기' })).toBeInTheDocument()
    expect(screen.getByText('기출변형')).toBeInTheDocument()
    await user.type(screen.getByLabelText('내 답', { selector: '#a-1' }), '네트워크 계층')
    await user.type(screen.getByLabelText('내 답', { selector: '#a-2' }), '핸드셰이크')
    expect(screen.getByText('2/2 작성')).toBeInTheDocument()
    // 새로고침해도 이어 풀 수 있게 저장
    expect(localStorage.getItem('reviewnotes.exam-draft.2024-1')).toContain('핸드셰이크')

    await user.click(screen.getByRole('button', { name: '제출하고 채점하기' }))
    expect(screen.getByText('3방향 핸드셰이크도 정답')).toBeInTheDocument()
    // 정답과 같은 1번은 미리 맞음
    const g1 = screen.getByRole('group', { name: '1번 채점' })
    expect(within(g1).getByRole('button', { name: /맞음/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(within(screen.getByRole('group', { name: '2번 채점' })).getByRole('button', { name: /부분/ }))
    await user.click(screen.getByRole('button', { name: '결과 보기' }))

    expect(await screen.findByText('75점')).toBeInTheDocument()
    const [saved] = await listExamResults('2024-1')
    expect(saved).toMatchObject({ score: 75, results: { 1: 'correct', 2: 'partial' } })
    expect(localStorage.getItem('reviewnotes.exam-draft.2024-1')).toBeNull()

    // 부분인 2번만 미리 골라져 있다
    const add = await screen.findByRole('button', { name: '오답노트에 넣기 (1)' })
    await user.click(add)
    await waitFor(() => expect(screen.getByText('오답노트에 있음')).toBeInTheDocument())
    const [problem] = await db.problems.toArray()
    expect(problem).toMatchObject({ source: '2024년 1회 정보처리기사 실기 2번', myAnswer: '핸드셰이크', category: 'network', status: 'draft' })
  })

  test('번호 빈칸은 칸마다 입력, 보기를 누르면 지금 칸에 들어가고 다음 칸으로', async () => {
    const user = userEvent.setup()
    const sqlExam = buildExam(
      2023,
      1,
      `## 1번 <sub>(난이도 하)</sub>

빈칸에 들어갈 키워드를 보기에서 골라 쓰시오.

**보기**: SELECT · FROM · WHERE · INTO
`,
      `## 1번
**유형**: sql
**정답**: ① SELECT ② FROM
`,
    )
    renderWith(<ExamSession exam={sqlExam} imageUrls={new Map()} />)
    const choices = screen.getByRole('group', { name: '1번 보기' })
    expect(screen.getByText('보기를 누르면 ① 칸에 들어가요')).toBeInTheDocument()
    await user.click(within(choices).getByRole('button', { name: 'SELECT' }))
    expect(screen.getByLabelText('①')).toHaveValue('SELECT')
    expect(screen.getByLabelText('②')).toHaveFocus()
    await user.click(within(choices).getByRole('button', { name: 'WHERE' }))
    expect(screen.getByLabelText('②')).toHaveValue('WHERE')
    expect(localStorage.getItem('reviewnotes.exam-draft.2023-1')).toContain('① SELECT ② WHERE')

    await user.click(screen.getByRole('button', { name: '제출하고 채점하기' }))
    // 칸별 대조표: ①만 일치 → 부분으로 미리 채점
    const table = screen.getByRole('table')
    expect(within(table).getAllByLabelText('일치')).toHaveLength(2) // 머리글 + ①
    expect(within(table).getByLabelText('글자가 다름 — 직접 판단')).toBeInTheDocument()
    const g = screen.getByRole('group', { name: '1번 채점' })
    expect(within(g).getByRole('button', { name: /부분/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('보기만 고르는 문제는 입력란 없이 버튼으로, 순서 문제는 누른 순서가 보인다', async () => {
    const user = userEvent.setup()
    const choiceExam = buildExam(
      2023,
      2,
      `## 1번

다음 설명에 해당하는 공격 기법을 쓰시오.

**보기**: Smurf · Land Attack · Tear Drop

---

## 2번

Database 구축 프로세스를 순서대로 나열하시오.

**보기**: 구현 · 요구사항 분석 · 개념적 설계
`,
      `## 1번
**정답**: Land Attack

## 2번
**정답**: 요구사항 분석 → 개념적 설계 → 구현
`,
    )
    renderWith(<ExamSession exam={choiceExam} imageUrls={new Map()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    // 본문의 보기 줄은 버튼과 겹치므로 숨긴다
    expect(screen.queryByText(/Smurf · Land Attack/)).not.toBeInTheDocument()

    const g1 = screen.getByRole('group', { name: '1번 보기' })
    await user.click(within(g1).getByRole('button', { name: 'Land Attack' }))
    expect(within(g1).getByRole('button', { name: 'Land Attack' })).toHaveAttribute('aria-pressed', 'true')

    const g2 = screen.getByRole('group', { name: '2번 보기' })
    await user.click(within(g2).getByRole('button', { name: '요구사항 분석' }))
    await user.click(within(g2).getByRole('button', { name: '개념적 설계' }))
    await user.click(within(g2).getByRole('button', { name: '구현' }))
    expect(within(g2).getByRole('button', { name: /③\s*구현/ })).toBeInTheDocument()
    expect(screen.getByText('요구사항 분석 → 개념적 설계 → 구현')).toBeInTheDocument()
    expect(screen.getByText('2/2 작성')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '제출하고 채점하기' }))
    for (const n of [1, 2]) {
      expect(within(screen.getByRole('group', { name: `${n}번 채점` })).getByRole('button', { name: /맞음/ })).toHaveAttribute('aria-pressed', 'true')
    }
  })

  test('비운 문제가 있으면 확인하고, 비운 문제는 틀림으로 시작', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderWith(<ExamSession exam={exam} imageUrls={new Map()} />)
    await user.click(screen.getByRole('button', { name: '제출하고 채점하기' }))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('2문제를 비워'))
    const g2 = screen.getByRole('group', { name: '2번 채점' })
    expect(within(g2).getByRole('button', { name: /틀림/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('회차 목록에 최근 점수가 보인다', async () => {
    await db.examResults.add({ id: 'r1', examId: '2024-1', takenAt: Date.now(), answers: {}, results: {}, score: 65 })
    renderWith(<ExamListPage exams={[exam]} />)
    expect(screen.getByRole('heading', { name: '2024년' })).toBeInTheDocument()
    expect(await screen.findByText('65점')).toBeInTheDocument()
  })

  test('모의고사 목록은 /mocks로 연결하고 기출변형 수를 보여 준다', () => {
    const mock = { ...exam, id: 'mock-1', kind: 'mock' as const, year: 0, title: '모의고사 1회' }
    renderWith(<ExamListPage kind="mock" exams={[mock]} />)
    expect(screen.getByRole('heading', { name: '모의고사', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /1회/ })).toHaveAttribute('href', '/mocks/mock-1')
    expect(screen.getByText(/기출변형 1/)).toBeInTheDocument()
  })

  test('파일이 없으면 안내', () => {
    renderWith(<ExamListPage exams={[]} />)
    expect(screen.getByText('기출문제 파일이 없어요')).toBeInTheDocument()
  })
})
