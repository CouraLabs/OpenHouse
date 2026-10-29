import { IconWell } from '@/components/icon-well.js'
import { Reveal } from '@/components/reveal.js'
import type { Planner } from '@/lib/content.js'

/** One planner as a document row: icon well, title, and its one-line body. */
export function PlannerRow({
  planner,
  index,
}: {
  planner: Planner
  index: number
}) {
  return (
    <Reveal
      as="li"
      index={index}
      className="border-line grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1 border-b py-6 md:grid-cols-[auto_16rem_1fr] md:items-center md:gap-x-8"
    >
      <IconWell icon={planner.icon} tone={planner.tone} />
      <h3 className="text-ink font-display text-[1.05rem] font-medium tracking-[-0.02em]">
        {planner.title}
      </h3>
      <p className="col-start-2 text-sm text-pretty text-muted md:col-start-3">
        {planner.body}
      </p>
    </Reveal>
  )
}
