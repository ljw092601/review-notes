import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, test } from 'vitest'
import { db, examScore, listImages, listAttempts, saveExamResult, listExamResults } from '@/db'
import { loadExams } from '@/features/exams/data'
import { addToNotes, examSource, toProblemInput } from '@/features/exams/notes'
import { buildExam, examFigureNames, parseAnswers, parseExamFileName, parseQuestions, rewriteFigures } from '@/features/exams/parse'
import { initialGrades } from '@/features/exams/session'
import { suggestByText } from '@/features/quiz/session'

const QUESTIONS = `# 2024년 1회 정보처리기사 실기 기출문제

> 출처: 정처기 감자 (jeongcheogi.edugamja.com) · 총 3문제

## 1번 <sub>(난이도 하 · 기출변형)</sub>

다음 설명에 해당하는 용어를 쓰시오.

---

## 2번 <sub>(난이도 중)</sub>

다음 Python 코드의 출력 결과를 쓰시오.

\`\`\`python
## 2번 같은 주석도 제목이 아니다
print(1)
\`\`\`

![2번 그림](images/2024-1_q02_1.png)

---

## 3번

빈칸을 채우시오.
`

const ANSWERS = `# 2024년 1회 정보처리기사 실기 정답

## 1번
**유형**: terminology
**정답**: 데이터 마이닝(Data Mining)

## 2번
**유형**: programming
**정답**:
\`\`\`text
1
\`\`\`
> 비고: 끝에 줄바꿈 없음

## 3번
**유형**: sql
**정답**: ① SELECT ② FROM
`

describe('파일 이름', () => {
  test('연도·회차·정답 여부', () => {
    expect(parseExamFileName('/inbox/기출문제/2024년 1회 정보처리기사 실기.md')).toEqual({ kind: 'past', year: 2024, round: 1, isAnswer: false })
    expect(parseExamFileName('2024년 1회 정보처리기사 실기 정답.md')).toEqual({ kind: 'past', year: 2024, round: 1, isAnswer: true })
    expect(parseExamFileName('/inbox/모의고사/모의고사 2회 정보처리기사 실기 정답.md')).toEqual({ kind: 'mock', year: 0, round: 2, isAnswer: true })
    expect(parseExamFileName('README.md')).toBeNull()
  })
})

describe('문제 파일', () => {
  test('번호·난이도·기출변형·본문을 나누고 구분선을 뗀다', () => {
    const qs = parseQuestions(QUESTIONS)
    expect(qs.map((q) => q.number)).toEqual([1, 2, 3])
    expect(qs[0]).toMatchObject({ difficulty: '하', variant: true, body: '다음 설명에 해당하는 용어를 쓰시오.' })
    expect(qs[1].difficulty).toBe('중')
    expect(qs[1].variant).toBe(false)
    expect(qs[1].body).toContain('## 2번 같은 주석도 제목이 아니다')
    expect(qs[1].body.endsWith('---')).toBe(false)
    expect(qs[2].difficulty).toBeUndefined()
  })
})

describe('정답 파일', () => {
  test('유형·한 줄 정답·코드 블록 정답·비고', () => {
    const a = parseAnswers(ANSWERS)
    expect(a.get(1)).toEqual({ answer: '데이터 마이닝(Data Mining)', note: '', category: 'terminology' })
    expect(a.get(2)).toEqual({ answer: '```text\n1\n```', note: '끝에 줄바꿈 없음', category: 'programming' })
    expect(a.get(3)?.answer).toBe('① SELECT ② FROM')
  })

  test('CRLF 줄바꿈도 읽는다', () => {
    expect(parseAnswers(ANSWERS.replace(/\n/g, '\r\n')).get(2)?.answer).toBe('```text\n1\n```')
  })
})

describe('회차 만들기', () => {
  test('문제와 정답을 합치고 출처를 읽는다', () => {
    const exam = buildExam(2024, 1, QUESTIONS, ANSWERS)
    expect(exam).toMatchObject({ id: '2024-1', title: '2024년 1회', source: '정처기 감자 (jeongcheogi.edugamja.com)' })
    expect(exam.questions[2]).toMatchObject({ answer: '① SELECT ② FROM', category: 'sql' })
  })

  test('파일 묶음에서 회차를 최신순으로, 정답 파일은 짝을 찾아 붙인다', () => {
    const exams = loadExams({
      '/inbox/기출문제/2023년 3회 정보처리기사 실기.md': QUESTIONS,
      '/inbox/기출문제/2024년 1회 정보처리기사 실기.md': QUESTIONS,
      '/inbox/기출문제/2024년 1회 정보처리기사 실기 정답.md': ANSWERS,
      '/inbox/기출문제/메모.md': '# 아무거나',
    })
    expect(exams.map((e) => e.id)).toEqual(['2024-1', '2023-3'])
    expect(exams[0].questions[0].answer).toBe('데이터 마이닝(Data Mining)')
    expect(exams[1].questions[0].answer).toBe('')
  })

  test('모의고사는 기출과 따로 id·제목을 붙인다', () => {
    const exams = loadExams({
      '/inbox/기출문제/2024년 1회 정보처리기사 실기.md': QUESTIONS,
      '/inbox/모의고사/모의고사 1회 정보처리기사 실기.md': QUESTIONS,
      '/inbox/모의고사/모의고사 1회 정보처리기사 실기 정답.md': ANSWERS,
    })
    const mock = exams.find((e) => e.kind === 'mock')!
    expect(mock).toMatchObject({ id: 'mock-1', title: '모의고사 1회' })
    expect(mock.questions[0].answer).toBe('데이터 마이닝(Data Mining)')
    expect(exams.find((e) => e.kind === 'past')?.questions[0].answer).toBe('')
    expect(examSource(mock, mock.questions[0])).toBe('모의고사 1회 정보처리기사 실기 1번')
    expect(toProblemInput(mock, mock.questions[0], '', new Set()).tags).toEqual(['모의고사', 'mock-1'])
  })

  test('그림 참조를 찾고 바꾼다', () => {
    const body = parseQuestions(QUESTIONS)[1].body
    expect(examFigureNames(body)).toEqual(['2024-1_q02_1.png'])
    expect(rewriteFigures(body, (n) => `/x/${n}`)).toContain('![2번 그림](/x/2024-1_q02_1.png)')
    expect(rewriteFigures(body, () => undefined)).toBe(body)
  })
})

describe('채점', () => {
  test('빈칸 번호와 공백을 무시하고 비교한다', () => {
    expect(suggestByText('① SELECT ② FROM', 'select from')).toBe('correct')
    expect(suggestByText('데이터 마이닝(Data Mining)', 'data mining')).toBe('correct')
    expect(suggestByText('데이터 마이닝', '')).toBe('wrong')
    expect(suggestByText('데이터 마이닝', '빅데이터')).toBeUndefined()
  })

  test('처음 채점: 같으면 맞음, 비우면 틀림, 나머지는 비워 둔다', () => {
    const exam = buildExam(2024, 1, QUESTIONS, ANSWERS)
    expect(initialGrades(exam, { 1: '데이터 마이닝', 3: 'SELECT, WHERE' })).toEqual({ 1: 'correct', 2: 'wrong' })
  })

  test('100점 만점, 부분은 절반', () => {
    expect(examScore({ 1: 'correct', 2: 'partial', 3: 'wrong', 4: 'correct' }, 4)).toBe(63)
    expect(examScore({}, 0)).toBe(0)
  })
})

describe('DB', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  test('풀이 기록을 최근 순으로', async () => {
    await saveExamResult({ examId: '2024-1', answers: {}, results: { 1: 'correct' }, score: 5 })
    await new Promise((r) => setTimeout(r, 2))
    await saveExamResult({ examId: '2024-1', answers: {}, results: { 1: 'wrong' }, score: 0 })
    await saveExamResult({ examId: '2023-3', answers: {}, results: {}, score: 0 })
    const list = await listExamResults('2024-1')
    expect(list.map((r) => r.score)).toEqual([0, 5])
  })

  test('오답노트에 넣기: 그림을 붙이고 복습 기록을 남기며, 두 번째부터는 기록만 더한다', async () => {
    const exam = buildExam(2024, 1, QUESTIONS, ANSWERS)
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })
    const opts = {
      categoryIds: new Set(['programming', 'etc']),
      imageUrls: new Map([['2024-1_q02_1.png', '/inbox/x.png']]),
      fetchBlob: async () => png,
    }
    const items = [
      { question: exam.questions[1], answer: '2', result: 'wrong' as const },
      { question: exam.questions[2], answer: 'SELECT', result: 'partial' as const },
    ]
    expect(await addToNotes(exam, items, opts)).toEqual({ created: 2, updated: 0 })

    const problems = await db.problems.toArray()
    const p2 = problems.find((p) => p.source === examSource(exam, exam.questions[1]))!
    expect(p2).toMatchObject({ category: 'programming', status: 'draft', myAnswer: '2', tags: ['기출', '2024-1'] })
    expect(p2.question).toContain('![2번 그림](img:2024-1_q02_1.png)')
    expect(p2.correctAnswer).toBe('```text\n1\n```\n\n> 끝에 줄바꿈 없음')
    expect((await listImages(p2.id)).map((i) => i.name)).toEqual(['2024-1_q02_1.png'])
    // 없는 유형(sql)은 기타로
    expect(problems.find((p) => p.source === examSource(exam, exam.questions[2]))?.category).toBe('etc')

    expect(await addToNotes(exam, items.slice(0, 1), opts)).toEqual({ created: 0, updated: 1 })
    expect(await db.problems.count()).toBe(2)
    expect((await listAttempts(p2.id)).map((a) => a.result)).toEqual(['wrong', 'wrong'])
  })

  test('출처 문구', () => {
    const exam = buildExam(2024, 1, QUESTIONS, ANSWERS)
    expect(examSource(exam, exam.questions[0])).toBe('2024년 1회 정보처리기사 실기 1번')
    expect(toProblemInput(exam, exam.questions[0], '', new Set(['terminology'])).category).toBe('terminology')
  })
})
