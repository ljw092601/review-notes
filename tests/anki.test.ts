import { describe, expect, test } from 'vitest'
import {
  ankiTag,
  buildAnkiFile,
  buildBackExtra,
  candidateTerms,
  findTermBlanks,
  flattenHtml,
  parseDataT,
  renderAnki,
  renderPreview,
  splitAnswer,
  styleForAnki,
  toggleBlankAt,
  trimParticle,
  validBlanks,
  withText,
} from '@/features/anki/cloze'
import { markdownToHtml } from '@/features/anki/markdownHtml'
import type { Problem } from '@/models/types'

const problem: Problem = {
  id: 'p1',
  certification: '정보처리기사',
  category: 'os',
  source: '2024년 2회 기출 5번',
  answerType: 'short',
  question: '다음은 스케줄링에 관한 내용이다.',
  myAnswer: '',
  correctAnswer: 'A: FCFS, B: SJF, C: RR, D: SRT',
  explanation: '**핵심 개념**: 비선점 기법마다 선점 짝이 있다.\n\n| 비선점 | 선점 짝 |\n|---|---|\n| FCFS(FIFO) | RR |\n| SJF | SRT |\n\n- HRN은 Starvation을 해결한다',
  wrongReason: '',
  status: 'done',
  tags: ['CPU 스케줄링', 'HRN'],
  createdAt: 1,
  updatedAt: 1,
}

describe('정답 → 용어 조각', () => {
  test('번호·레이블·괄호를 벗긴다', () => {
    expect(splitAnswer('① Bridge, ② Observer')).toEqual(['Bridge', 'Observer'])
    expect(splitAnswer('A: FCFS, B: SJF, C: RR, D: SRT')).toEqual(['FCFS', 'SJF', 'RR', 'SRT'])
    expect(splitAnswer('경계값 분석(Boundary Value Analysis)')).toEqual(['경계값 분석', 'Boundary Value Analysis'])
    expect(splitAnswer('라우터 (확인 필요: 스위치일 수도)')).toEqual(['라우터'])
    expect(splitAnswer('9, 9, a')).toEqual([])
  })

  test('후보 용어는 정답 + 태그', () => {
    expect(candidateTerms(problem)).toEqual(['FCFS', 'SJF', 'RR', 'SRT', 'CPU 스케줄링', 'HRN'])
  })
})

describe('자리 찾기', () => {
  test('용어가 나오는 자리를 전부, 코드 안은 빼고, 영문은 단어 경계로', () => {
    const html = '<p><strong>Git</strong>은 GitHub와 다르다. <code>Git</code> 명령. Git 좋다</p>'
    // 텍스트 노드: 0 "Git" / 1 "은 GitHub와 다르다. " / (code는 제외) / 2 " 명령. Git 좋다"
    expect(findTermBlanks(html, ['Git'])).toEqual([
      { node: 0, start: 0, end: 3 },
      { node: 2, start: 5, end: 8 },
    ])
  })

  test('한글은 조사가 붙어도 잡히고 긴 용어가 우선', () => {
    const html = '<p>경계값 분석은 경계값을 본다</p>'
    expect(findTermBlanks(html, ['경계값', '경계값 분석'])).toEqual([
      { node: 0, start: 0, end: 6 },
      { node: 0, start: 8, end: 11 },
    ])
  })

  test('표 셀 안도 텍스트 노드 순번으로 잡힌다', () => {
    const html = markdownToHtml(problem.explanation)
    const blanks = findTermBlanks(html, ['FCFS', 'RR'])
    expect(blanks.length).toBe(2)
    const out = renderAnki(html, blanks, { perTerm: true }).html
    expect(out).toMatch(/<td>\{\{c1::FCFS\}\}\(FIFO\)<\/td>/)
    expect(out).toMatch(/<td>\{\{c2::RR\}\}<\/td>/)
  })
})

describe('클릭으로 켜고 끄기', () => {
  const html = '<p>다이어그램은 사물과 관계를 그린 다이어그램이다. 응집도는 높게</p>'
  const context = '다이어그램은 사물과 관계를 그린 다이어그램이다. 응집도는 높게'

  test('조사는 뗀다. 단, 뗀 말이 다른 곳에도 나올 때만', () => {
    expect(trimParticle('다이어그램은', context)).toBe('다이어그램')
    expect(trimParticle('응집도는', context)).toBe('응집도')
    expect(trimParticle('응집도', context)).toBe('응집도')
    expect(trimParticle('경로', context)).toBe('경로')
    expect(trimParticle('다이어그램이다', context)).toBe('다이어그램')
    expect(trimParticle('Git', context)).toBe('Git')
  })

  test('빈 자리를 클릭하면 추가(조사 제외), 빈칸을 클릭하면 제거', () => {
    const added = toggleBlankAt(html, [], { node: 0, start: 0, end: 6 }, context)
    expect(added).toEqual([{ node: 0, start: 0, end: 5 }])
    const removed = toggleBlankAt(html, added, { node: 0, start: 0, end: 5 }, context)
    expect(removed).toEqual([])
    // 같은 단어의 다른 자리는 따로
    const second = toggleBlankAt(html, added, { node: 0, start: 18, end: 25 }, context)
    expect(second).toEqual([
      { node: 0, start: 0, end: 5 },
      { node: 0, start: 18, end: 23 },
    ])
  })

  test('미리보기는 빈칸을 mark로, 나머지 단어를 data-t span으로', () => {
    const out = renderPreview('<p>라우터는 <em>3계층.</em></p>', [{ node: 0, start: 0, end: 3 }])
    expect(out).toBe('<p><mark class="cloze" data-t="0:0:3">라우터</mark><span class="word" data-t="0:3:4">는</span> <em><span class="word" data-t="1:0:3">3계층</span>.</em></p>')
    expect(renderPreview('<p>a.length i++ k</p>', [])).toBe('<p><span class="word" data-t="0:0:8">a.length</span> <span class="word" data-t="0:9:12">i++</span> <span class="word" data-t="0:13:14">k</span></p>')
    expect(parseDataT('1:0:3')).toEqual({ node: 1, start: 0, end: 3 })
    expect(parseDataT('x')).toBeNull()
  })

  test('저장한 자리는 글자가 맞을 때만 되살린다', () => {
    const stored = withText(html, [{ node: 0, start: 0, end: 5 }])
    expect(stored).toEqual([{ node: 0, start: 0, end: 5, text: '다이어그램' }])
    expect(validBlanks(html, stored)).toEqual([{ node: 0, start: 0, end: 5 }])
    expect(validBlanks('<p>바뀐 풀이</p>', stored)).toEqual([])
  })
})

describe('Anki 렌더', () => {
  test('perTerm이면 같은 단어끼리 같은 번호, 아니면 전부 c1. 카드 수도 센다', () => {
    const html = '<p>FCFS와 SJF, 다시 FCFS</p>'
    const blanks = findTermBlanks(html, ['FCFS', 'SJF'])
    const all = renderAnki(html, blanks, { perTerm: false })
    expect(all.html).toBe('<p>{{c1::FCFS}}와 {{c1::SJF}}, 다시 {{c1::FCFS}}</p>')
    expect(all).toMatchObject({ blanks: 3, cards: 1 })
    const per = renderAnki(html, blanks, { perTerm: true })
    expect(per.html).toBe('<p>{{c1::FCFS}}와 {{c2::SJF}}, 다시 {{c1::FCFS}}</p>')
    expect(per).toMatchObject({ blanks: 3, cards: 2 })
  })

  test('빈칸이 없으면 그대로', () => {
    expect(renderAnki('<p>abc</p>', [], { perTerm: false })).toEqual({ html: '<p>abc</p>', blanks: 0, cards: 0 })
  })
})

describe('Anki 파일', () => {
  test('헤더와 탭 구분 행, 줄바꿈 제거, 태그 공백 치환, 표 스타일', () => {
    const text = buildAnkiFile(
      [
        {
          text: '<p>{{c1::라우터}}는 3계층</p>\n<table><tr><th>a</th><td>b</td></tr></table>\n<pre><code>a\nb</code></pre>',
          backExtra: '<div>정답 라우터</div>',
          tags: ['네트워크', 'CPU 스케줄링'],
          guid: 'reviewnotes-p1',
        },
      ],
      { deck: '정보처리기사 오답노트', noteType: 'Cloze' },
    )
    const lines = text.trimEnd().split('\n')
    expect(lines.slice(0, 6)).toEqual(['#separator:tab', '#html:true', '#notetype:Cloze', '#deck:정보처리기사 오답노트', '#tags column:3', '#guid column:4'])
    const cols = lines[6].split('\t')
    expect(cols.length).toBe(4)
    expect(cols[0]).toContain('<p>{{c1::라우터}}는 3계층</p> <table style="border-collapse:collapse')
    expect(cols[0]).toContain('<th style="border:1px solid #999')
    expect(cols[0]).toContain('<code>a<br>b</code>')
    expect(cols[0]).not.toContain('\n')
    expect(cols[1]).toBe('<div>정답 라우터</div>')
    expect(cols[2]).toBe('네트워크 CPU_스케줄링')
    expect(cols[3]).toBe('reviewnotes-p1')
  })

  test('노트 유형을 비우면 헤더에서 빠진다', () => {
    const text = buildAnkiFile([], { deck: 'D', noteType: '' })
    expect(text).not.toContain('#notetype')
    expect(text).toContain('#deck:D')
  })

  test('flattenHtml·styleForAnki·ankiTag', () => {
    expect(flattenHtml('<p>a</p>\n<p>b\tc</p>')).toBe('<p>a</p> <p>b  c</p>')
    expect(styleForAnki('<p><code>x</code></p><pre><code>y</code></pre>')).toBe(
      '<p><code style="background:rgba(128,128,128,0.15);padding:0 4px;border-radius:3px">x</code></p><pre style="background:rgba(128,128,128,0.15);padding:8px 10px;border-radius:4px;text-align:left;overflow-x:auto"><code>y</code></pre>',
    )
    expect(ankiTag('  소프트웨어 설계 ')).toBe('소프트웨어_설계')
  })

  test('뒷면에는 문제·정답·출처가 들어간다', () => {
    const back = buildBackExtra(problem, '<p>문제</p>', { id: 'os', name: '운영체제', description: '', order: 1 })
    expect(back).toContain('<div class="rn-question"><p>문제</p></div>')
    expect(back).toContain('<b>정답</b> A: FCFS, B: SJF, C: RR, D: SRT')
    expect(back).toContain('운영체제 · 2024년 2회 기출 5번')
    expect(buildBackExtra(problem, null)).not.toContain('rn-question')
  })
})

describe('마크다운 → HTML', () => {
  test('표와 굵게가 HTML로 나온다', () => {
    const html = markdownToHtml('**핵심**\n\n| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<strong>핵심</strong>')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>1</td>')
  })
})
