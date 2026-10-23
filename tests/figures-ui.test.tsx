import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { router } from '@/App'
import { addImage, createProblem, db } from '@/db'

function renderAt(path: string) {
  render(<RouterProvider router={createMemoryRouter(router.routes, { initialEntries: [path] })} />)
}

const png = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })

let id = ''
beforeEach(async () => {
  await db.delete()
  await db.open()
  const p = await createProblem({
    certification: '정보처리기사',
    category: 'design',
    answerType: 'short',
    question: '다음 다이어그램의 명칭을 쓰시오.\n\n![판매 패키지 다이어그램](img:fig-1.png)',
    myAnswer: '',
    correctAnswer: '패키지 다이어그램',
    explanation: '',
    wrongReason: '',
    status: 'draft',
    tags: [],
  })
  id = p.id
  await addImage(id, png(), '스크린샷 2026-10-15 001010.png')
  await addImage(id, png(), 'fig-1.png')
  if (!URL.createObjectURL) Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:x', configurable: true, writable: true })
  if (!URL.revokeObjectURL) Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true, writable: true })
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:fig')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

describe('본문 그림', () => {
  test('상세 화면은 본문 자리에 그림을 그리고, 원본 사진 수에서는 뺀다', async () => {
    renderAt(`/problems/${id}`)
    // 마크다운 파서가 lazy라 전체 테스트를 같이 돌리면 첫 로드가 느릴 수 있다
    const img = await screen.findByRole('img', { name: '판매 패키지 다이어그램' }, { timeout: 5000 })
    expect(img).toHaveAttribute('src', 'blob:fig')
    expect(img).toHaveClass('md-figure')
    expect(screen.getByRole('button', { name: /원본 사진 1장/ })).toBeInTheDocument()
  })

  test('참조하는 그림이 없으면 자리 표시만 남는다', async () => {
    await db.images.filter((img) => img.name === 'fig-1.png').delete()
    renderAt(`/problems/${id}`)
    expect(await screen.findByText('[그림 없음: fig-1.png]', undefined, { timeout: 5000 })).toBeInTheDocument()
  })
})
