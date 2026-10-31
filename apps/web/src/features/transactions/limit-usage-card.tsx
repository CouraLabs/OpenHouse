import type { LimitUsage } from '@workspace/dto'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { GaugeBar } from '@workspace/ui/components/gauge-bar'
import { StatusPill } from '@workspace/ui/components/status-pill'

import { formatMoney } from '@/lib/format-money.js'

export function LimitUsageCard({
  title,
  description,
  icon,
  usage,
  locale,
  labels,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  usage: LimitUsage[]
  locale: string
  labels: {
    empty: string
    aria: (limit: LimitUsage) => string
    excluded: (limit: LimitUsage) => string
    used?: (percent: number) => string
  }
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        {description !== undefined ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="gap-4">
        {usage.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          usage.map((limit) => {
            const percent =
              Number(limit.amount) > 0
                ? Math.round((Number(limit.spent) / Number(limit.amount)) * 100)
                : 0

            return (
              <div key={limit.id} className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">
                    {limit.categoryName}
                  </span>
                  {labels.used !== undefined ? (
                    <StatusPill tone={toneFor(percent)}>
                      {labels.used(percent)}
                    </StatusPill>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {limit.type}
                    </span>
                  )}
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
                {limit.excludedCount > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {labels.excluded(limit)}
                  </span>
                ) : null}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function toneFor(percent: number): 'negative' | 'warning' | 'positive' {
  if (percent >= 100) {
    return 'negative'
  }

  return percent >= 50 ? 'warning' : 'positive'
}

function colorFor(pct: number): string {
  if (pct >= 100) {
    return 'var(--negative)'
  }

  if (pct >= 50) {
    return 'var(--data-orange)'
  }

  return 'var(--data-in)'
}
