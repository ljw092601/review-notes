export function Placeholder({ title, stage }: { title: string; stage: number }) {
  return (
    <section className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
      <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">{title}</h1>
      <p className="mt-2 text-sm">단계 {stage}에서 구현 예정</p>
    </section>
  )
}
