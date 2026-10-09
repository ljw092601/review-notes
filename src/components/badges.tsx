import { categoryStyle } from '@/lib/categoryColor'
import { RESULT_LABEL } from '@/lib/labels'
import type { AttemptResult, Category, ProblemStatus } from '@/models/types'
import { Badge } from './ui'

const RESULT_TONE = { correct: 'success', partial: 'warn', wrong: 'error' } as const

export function CategoryBadge({ category, id }: { category?: Category; id: string }) {
  return (
    <Badge className="cat-badge" style={categoryStyle(id)}>
      {category?.name ?? id}
    </Badge>
  )
}

export function StatusBadge({ status }: { status: ProblemStatus }) {
  if (status === 'done') return null
  return <Badge tone="warn">입력 필요</Badge>
}

export function ResultBadge({ result }: { result: AttemptResult }) {
  return <Badge tone={RESULT_TONE[result]}>{RESULT_LABEL[result]}</Badge>
}
