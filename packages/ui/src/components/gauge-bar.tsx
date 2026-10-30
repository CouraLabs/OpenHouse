import { cn } from 'cn'

export interface GaugeBarProps {
  value: number
  max: number
  format: (value: number) => string
  colorFor?: (pct: number) => string
  'aria-label'?: string
  className?: string
}

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
