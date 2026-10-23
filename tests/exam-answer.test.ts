import { describe, expect, test } from 'vitest'
import { applyChoice, choiceMode, choiceValue, gradeAnswer, isChosen, joinBlanks, parseBlanks, parseChoices, pickCount, splitBlanks } from '@/features/exams/answer'
import { buildExam } from '@/features/exams/parse'

describe('번호 빈칸', () => {
  test('동그라미·(1)·(a) 번호를 칸으로 나눈다', () => {
    expect(parseBlanks('① 200 ② 3 ③ 1')).toEqual([
      { label: '①', answer: '200' },
      { label: '②', answer: '3' },
      { label: '③', answer: '1' },
    ])
    expect(parseBlanks('(1) 대칭키 암호화 (2) 비대칭키(공개키) 암호화')?.map((b) => b.answer)).toEqual(['대칭키 암호화', '비대칭키(공개키) 암호화'])
    expect(parseBlanks('(a) % (b) 10')?.map((b) => b.label)).toEqual(['(a)', '(b)'])
    // ①부터 시작하지 않아도 된다
    expect(parseBlanks('② 192.168.35.72 ④ 129.200.8.249')?.map((b) => b.label)).toEqual(['②', '④'])
    // 기호 하나짜리 칸
    expect(parseBlanks('① ∪ ② × ③ - ④ π')?.[2].answer).toBe('-')
  })

  test('칸이 아닌 답', () => {
    expect(parseBlanks('데이터 마이닝')).toBeNull()
    expect(parseBlanks('SRT(SRTF)')).toBeNull()
    expect(parseBlanks('① 하나뿐')).toBeNull()
    expect(parseBlanks('```text\n① 1\n② 2\n```')).toBeNull()
    expect(parseBlanks('설명 ① A ② B')).toBeNull()
  })

  test('칸별 값 ↔ 한 줄', () => {
    const labels = ['①', '②', '③']
    expect(joinBlanks(labels, ['SELECT', '', 'WHERE'])).toBe('① SELECT ②  ③ WHERE')
    expect(joinBlanks(labels, ['', '', ''])).toBe('')
    expect(splitBlanks(labels, '① SELECT ②  ③ WHERE')).toEqual(['SELECT', '', 'WHERE'])
    expect(splitBlanks(labels, '번호 없이 쓴 답')).toEqual(['번호 없이 쓴 답', '', ''])
  })
})

describe('보기', () => {
  test('보기 줄과 고를 개수', () => {
    expect(parseChoices('문제\n\n**보기**: 반정규화 · 무결성 · 정규화')).toEqual(['반정규화', '무결성', '정규화'])
    expect(parseChoices('보기 없음')).toBeUndefined()
    expect(pickCount('형상 관리 도구에 해당하는 것을 3가지 골라 쓰시오.')).toBe(3)
    expect(pickCount('알맞는 IP를 보기에서 골라 모두 작성하시오.')).toBe(99)
    expect(pickCount('용어를 쓰시오.')).toBe(1)
  })

  test('버튼 동작 방식', () => {
    expect(choiceMode('용어를 보기에서 골라 쓰시오.', ['성능', '운영', '보안', '자원'], 1)).toBe('single')
    expect(choiceMode('밑줄 친 곳에 들어갈 코드를 [보기]에서 골라', ['i', '(', 'n', '5', '%', ')'], 1)).toBe('token')
    expect(choiceMode('프로세스를 순서대로 나열하시오.', ['구현', '개념적 설계'], 1)).toBe('order')
    expect(choiceMode('3가지 골라 쓰시오.', ['CVS', 'JVM', 'SVN'], 3)).toBe('multi')
  })

  test('누르면 바뀌는 값', () => {
    expect(applyChoice('single', '', '반정규화')).toBe('반정규화')
    expect(applyChoice('single', '반정규화', '반정규화')).toBe('')
    expect(applyChoice('multi', 'CVS', 'SVN')).toBe('CVS, SVN')
    expect(applyChoice('multi', 'CVS, SVN', 'CVS')).toBe('SVN')
    expect(applyChoice('order', '요구사항 분석', '개념적 설계')).toBe('요구사항 분석 → 개념적 설계')
    expect(applyChoice('token', 'n[(', 'i')).toBe('n[(i')
    expect(isChosen('multi', 'CVS, SVN', 'SVN')).toBe(true)
    // 번호 붙은 보기는 번호만
    expect(choiceValue('1 : 192.168.34.1')).toBe('1')
    expect(choiceValue('Land Attack')).toBe('Land Attack')
    expect(applyChoice('multi', '1', '2 : 192.168.32.19')).toBe('1, 2')
  })
})

describe('자동 채점', () => {
  const blanks = parseBlanks('① SELECT ② FROM ③ WHERE')

  test('칸마다 비교: 다 맞으면 맞음, 일부면 부분, 비우면 틀림, 다 다르면 직접', () => {
    expect(gradeAnswer('① SELECT ② FROM ③ WHERE', '① select ② from ③ where', blanks)).toEqual({ suggestion: 'correct', blanks: [true, true, true] })
    expect(gradeAnswer('① SELECT ② FROM ③ WHERE', '① SELECT ② INTO ③ ', blanks)).toEqual({ suggestion: 'partial', blanks: [true, false, false] })
    expect(gradeAnswer('① SELECT ② FROM ③ WHERE', '', blanks).suggestion).toBe('wrong')
    expect(gradeAnswer('① SELECT ② FROM ③ WHERE', '① A ② B ③ C', blanks).suggestion).toBeUndefined()
  })

  test('기호 하나짜리 정답도 맞음', () => {
    const b = parseBlanks('① ∪ ② -')
    expect(gradeAnswer('① ∪ ② -', '① ∪ ② -', b).suggestion).toBe('correct')
  })

  test('쉼표로 나열한 답은 순서 무관, "중 N가지"는 그중 N개', () => {
    expect(gradeAnswer('원자성(Atomicity), 독립성(Isolation)', '독립성, 원자성').suggestion).toBe('correct')
    expect(gradeAnswer('1,2,3,4,5', '1, 2, 3, 4, 5').suggestion).toBe('correct')
    expect(gradeAnswer('CVS, SVN, RCS, GIT 중 3가지', 'GIT, CVS, RCS').suggestion).toBe('correct')
    expect(gradeAnswer('CVS, SVN, RCS, GIT 중 3가지', 'GIT, CVS').suggestion).toBeUndefined()
    expect(gradeAnswer('CVS, SVN, RCS, GIT 중 3가지', 'GIT, CVS, JVM').suggestion).toBeUndefined()
  })

  test('정답 파일과 합치면 문제에 칸·보기가 붙는다', () => {
    const exam = buildExam(2024, 1, '## 1번\n\n빈칸에 들어갈 용어를 쓰시오.\n\n**보기**: SELECT · FROM · WHERE · INTO', '## 1번\n**정답**: ① SELECT ② FROM')
    expect(exam.questions[0]).toMatchObject({ choices: ['SELECT', 'FROM', 'WHERE', 'INTO'], pick: 1, blanks: [{ label: '①' }, { label: '②' }] })
  })
})
