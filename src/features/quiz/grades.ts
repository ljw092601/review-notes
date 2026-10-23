import { Check, Minus, X } from 'lucide-react'
import type { AttemptResult } from '@/models/types'

/** 채점 버튼. 복습 퀴즈와 기출 풀기가 같이 쓴다 */
export const GRADES: Array<{ value: AttemptResult; label: string; key: string; icon: typeof Check; className: string }> = [
  { value: 'wrong', label: '틀림', key: '1', icon: X, className: 'border-error/40 text-error hover:bg-error-soft aria-pressed:bg-error-soft aria-pressed:border-error' },
  { value: 'partial', label: '부분', key: '2', icon: Minus, className: 'border-warn/40 text-warn hover:bg-warn-soft aria-pressed:bg-warn-soft aria-pressed:border-warn' },
  { value: 'correct', label: '맞음', key: '3', icon: Check, className: 'border-success/40 text-success hover:bg-success-soft aria-pressed:bg-success-soft aria-pressed:border-success' },
]
