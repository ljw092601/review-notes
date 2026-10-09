import { Link } from 'react-router-dom'
import { CategoryBadge, ResultBadge, StatusBadge } from '@/components/badges'
import { Chip } from '@/components/ui'
import { categoryStyle } from '@/lib/categoryColor'
import { excerpt, relativeDate } from '@/lib/text'
import type { Attempt, Category, Problem } from '@/models/types'

/** 목록 카드. 모든 카드가 같은 높이가 되도록 본문은 2줄, 태그는 1줄로 고정한다 */
export function ProblemCard({
  problem,
  category,
  latestAttempt,
}: {
  problem: Problem
  category?: Category
  latestAttempt?: Attempt
}) {
  return (
    <li className="min-w-0">
      <Link
        to={`/problems/${problem.id}`}
        style={categoryStyle(problem.category)}
        className="cat-stripe flex h-full flex-col rounded-card border border-rule bg-paper p-4 shadow-card transition-[transform,box-shadow] duration-(--dur-short) ease-(--ease-out) hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={category} id={problem.category} />
          <StatusBadge status={problem.status} />
          {latestAttempt && <ResultBadge result={latestAttempt.result} />}
          {problem.source && <span className="truncate text-xs text-neutral">{problem.source}</span>}
          <span className="ml-auto text-xs text-neutral tabular-nums">{relativeDate(problem.createdAt)}</span>
        </div>
        <p className="mt-2.5 line-clamp-2 min-h-[3.25em] text-[0.975rem] leading-relaxed text-ink">{excerpt(problem.question)}</p>
        <div className="mt-3 flex h-6 flex-wrap gap-1 overflow-hidden" aria-hidden={problem.tags.length === 0 || undefined}>
          {problem.tags.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </div>
      </Link>
    </li>
  )
}
