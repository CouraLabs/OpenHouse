import { GaugeBar } from '@workspace/ui/components/gauge-bar'

interface PlanUsageRowProps {
  label: string
  used: number
  limit: number | null
  unlimitedLabel: string
}

export function PlanUsageRow({
  label,
  used,
  limit,
  unlimitedLabel,
}: PlanUsageRowProps) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-sm">{label}</span>
      {limit === null ? (
        <span className="text-sm text-muted-foreground tabular-nums">
          {used} · {unlimitedLabel}
        </span>
      ) : (
        <GaugeBar
          value={used}
          max={limit}
          format={String}
          aria-label={label}
          className="sm:w-56"
        />
      )}
    </li>
  )
}
