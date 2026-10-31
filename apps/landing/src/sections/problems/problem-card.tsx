import type { Problem } from '@/lib/content.js'

export function ProblemCard({
  problem,
  index,
}: {
  problem: Problem
  index: number
}) {
  const Glyph = problem.icon

  return (
    <li className="border-line hover:bg-surface grid gap-3 border-b px-(--pad) py-7 transition-colors duration-200 ease-(--ease-out-expo) last:border-b-0 md:grid-cols-[var(--split)_1fr] md:gap-0 md:p-0">
      <div className="grid grid-cols-[2rem_1fr] items-baseline gap-3 md:py-9 md:pr-8 md:pl-(--pad)">
        <span className="font-mono text-[0.78rem] text-muted tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <h3 className="text-ink font-display text-[1.2rem] leading-[1.2] font-medium tracking-[-0.03em] text-balance">
          {problem.pain}
        </h3>
      </div>
      <div className="md:border-line flex items-start gap-4 pl-11 md:border-l md:py-9 md:pr-(--pad) md:pl-8">
        <Glyph
          aria-hidden
          weight="light"
          className="text-ink mt-0.5 size-5 shrink-0"
        />
        <p className="text-body max-w-[58ch] text-[1rem] text-pretty">
          {problem.fix}
        </p>
      </div>
    </li>
  )
}
