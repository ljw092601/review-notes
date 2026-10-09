import 'fake-indexeddb/auto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test } from 'vitest'
import { router } from '@/App'
import { addAttempt, createProblem, db } from '@/db'
import { filterCandidates, initialState, pickProblems, reduce, suggestResult, tally } from '@/features/quiz/session'
import type { Attempt, Problem, ProblemInput } from '@/models/types'

const base: ProblemInput = {
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
}

/** 여러 span으로 쪼개진 문단을 통째로 찾는다 */
const byP = (re: RegExp) => (_: string, el: Element | null) => el?.tagName === 'P' && re.test(el.textContent ?? '')

function renderAt(path: string) {
  const memoryRouter = createMemoryRouter(router.routes, { initialEntries: [path] })
  render(<RouterProvider router={memoryRouter} />)
  return memoryRouter
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('복습 범위·순서', () => {
  const mk = (over: Partial<Problem>): Problem => ({
    id: over.id ?? crypto.randomUUID(),
    createdAt: 0,
    updatedAt: 0,
    ...base,
    ...over,
  })
  const att = (problemId: string, result: Attempt['result'], attemptedAt: number): Attempt => ({ id: problemId + attemptedAt, problemId, answer: '', result, attemptedAt })

  test('정답이 없는 문제는 빠지고 범위별로 걸러진다', () => {
    const a = mk({ id: 'a' })
    const b = mk({ id: 'b', status: 'done', explanation: 'x', wrongReason: 'y' })
    const c = mk({ id: 'c', correctAnswer: '' })
    const latest = new Map([
      ['a', att('a', 'wrong', 1)],
      ['b', att('b', 'correct', 2)],
    ])
    const all = [a, b, c]
    expect(filterCandidates(all, latest, { scope: 'all' }).map((p) => p.id)).toEqual(['a', 'b'])
    expect(filterCandidates(all, latest, { scope: 'wrong' }).map((p) => p.id)).toEqual(['a'])
    expect(filterCandidates(all, new Map(), { scope: 'unreviewed' }).map((p) => p.id)).toEqual(['a', 'b'])
    expect(filterCandidates(all, latest, { scope: 'done' }).map((p) => p.id)).toEqual(['b'])
  })

  test('오래 안 본 순 정렬과 개수 제한, 무작위는 주입한 난수를 쓴다', () => {
    const a = mk({ id: 'a' })
    const b = mk({ id: 'b' })
    const c = mk({ id: 'c' })
    const latest = new Map([
      ['a', att('a', 'wrong', 300)],
      ['c', att('c', 'wrong', 100)],
    ])
    expect(pickProblems([a, b, c], latest, { order: 'stale', limit: 0 }).map((p) => p.id)).toEqual(['b', 'c', 'a'])
    expect(pickProblems([a, b, c], latest, { order: 'stale', limit: 2 }).map((p) => p.id)).toEqual(['b', 'c'])
    expect(pickProblems([a, b, c], latest, { order: 'random', limit: 0 }, () => 0).map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })

  test('세션 상태: 답 공개 → 채점 → 다음, 마지막이면 결과', () => {
    const a = mk({ id: 'a' })
    const b = mk({ id: 'b' })
    let s = initialState([a, b])
    expect(s.phase).toBe('answer')
    s = reduce(s, { type: 'grade', result: 'correct' }) // 공개 전 채점은 무시
    expect(s.phase).toBe('answer')
    s = reduce(s, { type: 'reveal', answer: '네트워크' })
    expect(s.phase).toBe('reveal')
    s = reduce(s, { type: 'grade', result: 'wrong' })
    expect(s.index).toBe(1)
    expect(s.phase).toBe('answer')
    s = reduce(reduce(s, { type: 'reveal', answer: '' }), { type: 'grade', result: 'correct' })
    expect(s.phase).toBe('summary')
    expect(tally(s)).toEqual({ correct: 1, partial: 0, wrong: 1 })
    const retry = reduce(s, { type: 'retryWrong' })
    expect(retry.problems.map((p) => p.id)).toEqual(['a'])
    expect(retry.phase).toBe('answer')
  })

  test('단답형 채점 제안은 공백·대소문자·괄호 표기를 무시한다', () => {
    const p = mk({ correctAnswer: '제1정규형(1NF)' })
    expect(suggestResult(p, '제1정규형')).toBe('correct')
    expect(suggestResult(p, '1nf')).toBe('correct')
    expect(suggestResult(p, '2NF')).toBeUndefined()
    expect(suggestResult(p, '')).toBe('wrong')
    expect(suggestResult(mk({ answerType: 'essay' }), 'x')).toBeUndefined()
  })
})

describe('복습 화면', () => {
  test('문제가 없으면 시작 버튼이 비활성', async () => {
    renderAt('/quiz')
    expect(await screen.findByText('조건에 맞는 문제가 없어요')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '복습 시작' })).toBeDisabled()
  })

  test('문제 풀고 채점하면 복습 기록이 남고 결과가 보인다', async () => {
    const user = userEvent.setup()
    const p = await createProblem({ ...base, explanation: '3계층 = 네트워크', wrongReason: '전송은 4계층', status: 'done' })
    renderAt('/quiz')
    await screen.findByText(byP(/1개를 풀어요/))
    await user.click(screen.getByRole('button', { name: '복습 시작' }))
    expect(await screen.findByText('OSI 3계층은?')).toBeInTheDocument()
    expect(screen.queryByText('네트워크 계층')).not.toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: '내 답' }), '네트워크 계층')
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(await screen.findByText('3계층 = 네트워크')).toBeInTheDocument()
    expect(screen.getByText('전송은 4계층')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /맞음/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /맞음/ }))
    expect(await screen.findByText('복습 결과')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
    await waitFor(async () => {
      const attempts = await db.attempts.where('problemId').equals(p.id).toArray()
      expect(attempts).toHaveLength(1)
      expect(attempts[0]).toMatchObject({ answer: '네트워크 계층', result: 'correct' })
    })
  })

  test('최근에 틀린 것만 범위로 고르면 맞힌 문제는 빠진다', async () => {
    const user = userEvent.setup()
    const a = await createProblem({ ...base, question: '틀렸던 문제' })
    const b = await createProblem({ ...base, question: '맞혔던 문제' })
    await addAttempt(a.id, { answer: '', result: 'wrong' })
    await addAttempt(b.id, { answer: '', result: 'correct' })
    renderAt('/quiz')
    await screen.findByText(byP(/2개 중/))
    await user.click(screen.getByRole('radio', { name: /최근에 틀린 것/ }))
    expect(await screen.findByText(byP(/1개 중/))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '복습 시작' }))
    expect(await screen.findByText('틀렸던 문제')).toBeInTheDocument()
  })

  test('객관식은 보기를 눌러 답하고, 그만하기로 결과를 볼 수 있다', async () => {
    const user = userEvent.setup()
    await createProblem({ ...base, answerType: 'choice', question: '객관식?', choices: ['하나', '둘'], correctAnswer: '둘' })
    renderAt('/quiz')
    await screen.findByText(byP(/1개를 풀어요/))
    await user.click(screen.getByRole('button', { name: '복습 시작' }))
    await user.click(await screen.findByRole('radio', { name: /둘/ }))
    await user.click(screen.getByRole('button', { name: '정답 확인' }))
    expect(screen.getByRole('button', { name: /맞음/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: '그만하기' }))
    expect(await screen.findByText('복습 결과')).toBeInTheDocument()
    expect(screen.getByText('안 풂')).toBeInTheDocument()
    expect(await db.attempts.count()).toBe(0)
  })
})
