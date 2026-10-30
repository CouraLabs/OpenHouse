import { IconWell } from '@/components/icon-well.js'
import { Reveal } from '@/components/reveal.js'
import type { Problem } from '@/lib/content.js'

export function ProblemCard({
  problem,
  index,
}: {
  problem: Problem
  index: number
}) {
  return (
    <Reveal index={index}>
      <article className="border-line bg-surface flex h-full flex-col gap-5 rounded-[20px] border p-7 md:p-9">
        <IconWell icon={problem.icon} tone={problem.tone} />
        <h3 className="text-ink font-display text-[1.45rem] leading-[1.15] font-medium tracking-[-0.03em] text-balance">
          {problem.pain}
        </h3>
        <p className="text-body max-w-md text-sm text-pretty">{problem.fix}</p>
      </article>
    </Reveal>
  )
}
