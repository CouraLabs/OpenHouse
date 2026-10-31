import { cn } from 'cn'

export interface GaugeBarProps {
  value: number
  max: number
  format: (value: number) => string
  colorFor?: (pct: number) => string
  now?: number
  threshold?: number
  'aria-label'?: string
  className?: string
}

export function GaugeBar({
  value,
  max,
  format,
  colorFor,
  now,
  threshold,
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
      className={cn('flex min-w-40 flex-col gap-1.5', className)}
      {...aria}
    >
      <div className="relative h-1.5 w-full rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-400 ease-spring"
          style={{
            width: `${pct}%`,
            ...(colorFor !== undefined
              ? { backgroundColor: colorFor(pct) }
              : {}),
          }}
        />
        {threshold !== undefined ? (
          <span
            aria-hidden
            className="absolute -top-1 h-3.5 border-l border-dotted border-foreground/45"
            style={{ left: `${Math.min(Math.max(threshold, 0), 1) * 100}%` }}
          />
        ) : null}
        {now !== undefined ? (
          <span
            aria-hidden
            className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${Math.min(Math.max(now, 0), 1) * 100}%` }}
          />
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {format(value)} / {format(max)}
      </p>
    </div>
  )
}
