import { GoalRing } from '@/components/preview/goal-ring.js'

/** The sample goal: its ring, name, and how far the account has come. */
export function GoalVisual() {
  return (
    <div className="flex items-center gap-6">
      <GoalRing percent={68} />
      <div className="flex flex-col leading-snug">
        <span className="text-ink text-sm">Emergency fund</span>
        <span className="font-mono text-xs text-muted tabular-nums">
          $6,800 of $10,000
        </span>
        <span className="text-xs text-muted">High-yield savings</span>
      </div>
    </div>
  )
}
