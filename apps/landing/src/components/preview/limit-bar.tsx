import { cn } from 'cn'

import { useInView } from '@/lib/use-in-view.js'

/**
 * A category limit as a hairline-thin bar: the label and spent-of-cap above,
 * the fill scaled in from the left once it scrolls into view. Past 80% the
 * fill turns to the pale-red ink.
 */
export function LimitBar({
  label,
  spent,
  cap,
  percent,
}: {
  label: string
  spent: string
  cap: string
  percent: number
}) {
  const [ref, inView] = useInView<HTMLDivElement>()

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="font-mono text-xs text-muted tabular-nums">
          {spent} / {cap}
        </span>
      </div>
      <div className="bg-bone h-1.5 overflow-hidden rounded-full">
        <div
          style={{ transform: `scaleX(${inView ? percent / 100 : 0})` }}
          className={cn(
            'ease-out-expo h-full origin-left rounded-full transition-transform duration-1000 motion-reduce:transition-none',
            percent >= 80 ? 'bg-red-ink' : 'bg-ink'
          )}
        />
      </div>
    </div>
  )
}
