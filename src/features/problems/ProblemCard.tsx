import { Link } from 'react-router-dom'
import { CategoryBadge, ResultBadge, StatusBadge } from '@/components/badges'
import { Chip } from '@/components/ui'
import { excerpt, relativeDate } from '@/lib/text'
import type { Attempt, Category, Problem } from '@/models/types'

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
    <li>
      <Link
        to={`/problems/${problem.id}`}
        className="block rounded-card border border-rule bg-paper p-4 shadow-card transition-[transform,box-shadow] duration-(--dur-short) ease-(--ease-out) hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <CategoryBadge category={category} id={problem.category} />
          <StatusBadge status={problem.status} />
          {latestAttempt && <ResultBadge result={latestAttempt.result} />}
          {problem.source && <span className="text-xs text-neutral">{problem.source}</span>}
          <span className="ml-auto text-xs text-neutral tabular-nums">{relativeDate(problem.createdAt)}</span>
        </div>
        <p className="mt-2.5 line-clamp-2 text-[0.975rem] leading-relaxed text-ink">{excerpt(problem.question)}</p>
        {problem.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {problem.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}
      </Link>
    </li>
  )
}
