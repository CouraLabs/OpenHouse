import { GoalRing } from '@/components/preview/goal-ring.js'
import { useContent } from '@/lib/use-locale.js'

export function GoalVisual() {
  const { sampleGoal } = useContent()

  return (
    <div className="flex items-center gap-6">
      <GoalRing percent={68} />
      <div className="flex flex-col leading-snug">
        <span className="text-ink text-[0.9375rem] font-semibold">
          {sampleGoal.name}
        </span>
        <span className="text-[0.8125rem] text-muted tabular-nums">
          {sampleGoal.progress}
        </span>
        <span className="text-xs text-muted">{sampleGoal.account}</span>
      </div>
    </div>
  )
}
