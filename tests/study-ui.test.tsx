import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, test } from 'vitest'
import { ToastProvider } from '@/components/toast'
import { buildStudyAnkiFile, maskTerms } from '@/features/study/anki'
import { STUDY_TOPICS } from '@/features/study/content'
import { StudyPage } from '@/features/study/StudyPage'

function renderAt(path = '/study') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <StudyPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('암기 탭', () => {
  test('내용: GoF는 생성 5 · 구조 7 · 행위 11, 결합도 6 · 응집도 7', () => {
    const count = (topic: string, group: string) => STUDY_TOPICS.find((t) => t.id === topic)!.groups.find((g) => g.id === group)!.items.length
    expect([count('gof', 'creational'), count('gof', 'structural'), count('gof', 'behavioral')]).toEqual([5, 7, 11])
    expect([count('module', 'coupling'), count('module', 'cohesion')]).toEqual([6, 7])
    const ids = STUDY_TOPICS.flatMap((t) => t.groups.map((g) => g.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('기본은 결합도·응집도 표, 주제를 바꾸면 GoF', async () => {
    const user = userEvent.setup()
    renderAt()
    expect(screen.getByRole('heading', { name: '결합도 (Coupling)' })).toBeInTheDocument()
    expect(screen.getByText('자료 결합도')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'GoF 디자인 패턴' }))
    expect(screen.getByText('Decorator')).toBeInTheDocument()
    expect(screen.queryByText('자료 결합도')).not.toBeInTheDocument()
  })

  test('주소로 주제를 고를 수 있다', () => {
    renderAt('/study?t=testing')
    expect(screen.getByText('MC/DC')).toBeInTheDocument()
  })

  test('DB 이론·라우팅 프로토콜 주제', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('radio', { name: 'DB 이론' }))
    expect(screen.getByRole('heading', { name: '키 (Key)' })).toBeInTheDocument()
    expect(screen.getByText('디비전 (÷)')).toBeInTheDocument()
    expect(screen.getByText('참조 무결성')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: '라우팅 프로토콜' }))
    expect(screen.getByText('OSPF')).toBeInTheDocument()
    expect(screen.getByText('Border Gateway Protocol')).toBeInTheDocument()
  })

  test('용어 가리기: 눌러서 하나씩 보고, 다 펼치기·다시 가리기', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('radio', { name: '용어 가리기' }))
    expect(screen.queryByText('자료 결합도')).not.toBeInTheDocument()
    // 앞 글자 힌트도 답이 되므로 숨긴다
    expect(screen.queryByText('자 · 스 · 제 · 외 · 공 · 내')).not.toBeInTheDocument()
    expect(screen.getByText('남은 칸 13')).toBeInTheDocument()

    const coupling = screen.getByRole('heading', { name: '결합도 (Coupling)' }).closest('section')!
    await user.click(within(coupling).getByRole('button', { name: '1번 용어 보기' }))
    expect(screen.getByText('자료 결합도')).toBeInTheDocument()
    expect(screen.getByText('남은 칸 12')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다 펼치기' }))
    expect(screen.getByText('내용 결합도')).toBeInTheDocument()
    expect(screen.getByText('남은 칸 0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다시 가리기' }))
    expect(screen.queryByText('내용 결합도')).not.toBeInTheDocument()
  })

  test('설명 가리기: 용어는 보이고 설명이 가려진다', async () => {
    const user = userEvent.setup()
    renderAt()
    await user.click(screen.getByRole('radio', { name: '설명 가리기' }))
    expect(screen.getByText('자료 결합도')).toBeInTheDocument()
    expect(screen.queryByText(/필요한 데이터만 매개변수로/)).not.toBeInTheDocument()
    expect(screen.getByText('자 · 스 · 제 · 외 · 공 · 내')).toBeInTheDocument()
  })

  test('Anki 파일: 묶음마다 카드 1장, 앞면 설명들(용어는 가림), 뒷면 용어 표', () => {
    const { text, cards } = buildStudyAnkiFile(STUDY_TOPICS)
    const total = STUDY_TOPICS.reduce((n, t) => n + t.groups.length, 0)
    expect(cards).toBe(total)
    const lines = text.trimEnd().split('\n')
    expect(lines.slice(0, 2)).toEqual(['#separator:tab', '#html:true'])
    expect(lines).toContain('#deck:정처기::암기')
    expect(text).not.toContain('#notetype')
    const rows = lines.filter((l) => !l.startsWith('#'))
    expect(rows).toHaveLength(total)
    const guids = rows.map((r) => r.split('\t')[3])
    expect(new Set(guids).size).toBe(total)
    const coupling = rows.find((r) => r.endsWith('reviewnotes-study-coupling'))!.split('\t')
    expect(coupling[0]).toContain('결합도 (Coupling)')
    expect(coupling[0]).toContain('필요한 데이터만 매개변수로')
    expect(coupling[0]).toContain('여러 모듈이 참조한다')
    expect(coupling[0]).not.toContain('자료 결합도')
    expect(coupling[0]).not.toContain('자 · 스 · 제')
    expect(coupling[1]).toContain('자료 결합도')
    expect(coupling[1]).toContain('내용 결합도')
    expect(coupling[1]).toContain('Data Coupling')
    // 같은 묶음의 다른 용어(튜플)도 가린다
    const relation = rows.find((r) => r.endsWith('reviewnotes-study-relation'))!.split('\t')[0]
    expect(relation).not.toContain('튜플')
    expect(maskTerms('σ 조건(R)으로 셀렉트한다. π는 프로젝트', [{ term: '셀렉트 (σ)', en: 'Select' }, { term: '프로젝트 (π)' }])).toBe('＿＿ 조건(R)으로 ＿＿한다. ＿＿는 ＿＿')
  })
})
