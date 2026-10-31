import { IconWell } from '@/components/icon-well.js'
import type { Problem } from '@/lib/content.js'

export function ProblemCard({ problem }: { problem: Problem }) {
  return (
    <li className="flex flex-col gap-4 surface-card p-6 md:p-7">
      <IconWell icon={problem.icon} tone={problem.tone} />
      <div className="flex flex-col gap-2">
        <h3 className="text-ink text-[1.125rem] leading-snug font-semibold tracking-[-0.015em] text-balance">
          {problem.pain}
        </h3>
        <p className="text-[0.9375rem] text-pretty text-muted">{problem.fix}</p>
      </div>
    </li>
  )
}
