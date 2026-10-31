import { IconWell } from '@/components/icon-well.js'
import { Reveal } from '@/components/reveal.js'
import type { Planner } from '@/lib/content.js'

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
      className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-1 surface-card p-5 md:grid-cols-[auto_16rem_1fr] md:items-center md:gap-x-8 md:px-7"
    >
      <IconWell icon={planner.icon} tone={planner.tone} />
      <h3 className="text-ink text-[1.0625rem] font-semibold tracking-[-0.015em]">
        {planner.title}
      </h3>
      <p className="col-start-2 text-[0.9375rem] text-pretty text-muted md:col-start-3">
        {planner.body}
      </p>
    </Reveal>
  )
}
