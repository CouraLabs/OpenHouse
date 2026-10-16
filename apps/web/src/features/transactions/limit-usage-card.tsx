import type { LimitUsage } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { GaugeBar } from '@workspace/ui/components/gauge-bar'

import { formatMoney } from '@/lib/format-money.js'

/**
 * The limits card: one gauge per ACTIVE limit — what the period has spent
 * against what the limit allows, the API having done the totaling. The
 * fill runs green while the spending is small, warns as it nears the
 * limit, and turns red past it; the figure beside the gauge carries the
 * exact numbers, so the color never works alone.
 */
export function LimitUsageCard({
  title,
  icon,
  usage,
  locale,
  labels,
}: {
  title: string
  /** The icon naming what the card shows, rendered beside the title. */
  icon: React.ReactNode
  usage: LimitUsage[]
  locale: string
  /** The labels the card cannot derive, translated by the page. */
  labels: { empty: string; aria: (limit: LimitUsage) => string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          usage.map((limit) => (
            <div key={limit.id} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm">
                <span className="truncate">{limit.categoryName}</span>
                <span className="text-xs text-muted-foreground">
                  {limit.type}
                </span>
              </span>
              <GaugeBar
                value={Number(limit.spent)}
                max={Number(limit.amount)}
                format={(amount) =>
                  formatMoney(String(amount), locale, limit.currency)
                }
                colorFor={colorFor}
                aria-label={labels.aria(limit)}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

/**
 * The status of the spending, as the fill's color: green while there is
 * room, the warning amber from half the limit, the critical red past it —
 * the fixed status steps, reserved for state.
 */
function colorFor(pct: number): string {
  if (pct >= 100) {
    return '#d03b3b'
  }

  if (pct >= 50) {
    return '#fab219'
  }

  return '#0ca30c'
}
