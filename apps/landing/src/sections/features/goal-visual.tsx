import { GoalRing } from '@/components/preview/goal-ring.js'
import { useContent } from '@/lib/use-locale.js'

/** The sample goal: its ring, name, and how far the account has come. */
export function GoalVisual() {
  const { sampleGoal } = useContent()

  return (
    <div className="flex items-center gap-6">
      <GoalRing percent={68} />
      <div className="flex flex-col leading-snug">
        <span className="text-ink text-sm">{sampleGoal.name}</span>
        <span className="font-mono text-xs text-muted tabular-nums">
          {sampleGoal.progress}
        </span>
        <span className="text-xs text-muted">{sampleGoal.account}</span>
      </div>
    </div>
  )
}
