export type AnswerType = 'short' | 'essay' | 'choice'
export type ProblemStatus = 'draft' | 'done'
export type AnswerConfidence = 'high' | 'medium' | 'low'
export type AttemptResult = 'correct' | 'partial' | 'wrong'

/** 문제 유형 (보안 / 네트워크 / 프로그래밍 등). 시드 데이터는 categories.ts */
export interface Category {
  id: string
  name: string
  description: string
  order: number
}

/** 오답 문제 한 건 */
export interface Problem {
  id: string
  certification: string
  /** Category.id */
  category: string
  source?: string
  answerType: AnswerType
  /** 마크다운 */
  question: string
  /** 객관식일 때만 */
  choices?: string[]
  myAnswer: string
  correctAnswer: string
  /** Claude가 정답을 직접 풀어 채웠을 때의 확신도 */
  answerConfidence?: AnswerConfidence
  /** 마크다운. 사용자 입력 */
  explanation: string
  /** 마크다운. 사용자 입력 */
  wrongReason: string
  /** draft = 틀린 이유/풀이 미입력 */
  status: ProblemStatus
  tags: string[]
  createdAt: number
  updatedAt: number
}

/** 첨부 이미지. problemId로 조회 */
export interface ImageRecord {
  id: string
  problemId: string
  blob: Blob
  name: string
  createdAt: number
}

/** 복습 퀴즈 시도 기록 */
export interface Attempt {
  id: string
  problemId: string
  answer: string
  result: AttemptResult
  memo?: string
  attemptedAt: number
}

/** 문제 생성/수정 시 사용자가 채우는 필드 */
export type ProblemInput = Omit<Problem, 'id' | 'createdAt' | 'updatedAt'>

/** 앱 설정 한 건. 파일 시스템 핸들처럼 구조화 복제가 되는 값이면 무엇이든 */
export interface Setting {
  key: string
  value: unknown
}
