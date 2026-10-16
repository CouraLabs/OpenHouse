import { cn } from 'cn'

/**
 * The strings and formatting the gauge cannot derive — every user-facing
 * label and number arrives from the caller, translated and localized.
 */
export interface GaugeBarProps {
  /** The current value, clamped into `0..max` for the fill. */
  value: number
  /** The value the gauge fills toward; the scale's end. */
  max: number
  /** Formats one number for display — the caller's money formatter. */
  format: (value: number) => string
  /** The fill color for a progress percentage (0–100). Omit for the plain
   * primary fill; a caller can make the color grow with the progress. */
  colorFor?: (pct: number) => string
  /** Names the gauge for assistive technology, e.g. "progress toward target". */
  'aria-label'?: string
  className?: string
}

/**
 * A gauge: a horizontal bar that fills from 0 toward `max` as far as
 * `value` reaches, with `value / max` beside it. Label-agnostic — it renders
 * only what the caller passes and decides nothing about money or language.
 * A `max` of zero renders an empty bar rather than dividing by it.
 */
export function GaugeBar({
  value,
  max,
  format,
  colorFor,
  className,
  ...aria
}: GaugeBarProps) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('flex min-w-40 flex-col gap-1', className)}
      {...aria}
    >
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{
            width: `${pct}%`,
            ...(colorFor !== undefined
              ? { backgroundColor: colorFor(pct) }
              : {}),
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {format(value)} / {format(max)}
      </p>
    </div>
  )
}
