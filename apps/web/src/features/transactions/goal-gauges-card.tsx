import type { Goal } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { GaugeBar } from '@workspace/ui/components/gauge-bar'

import { formatMoney } from '@/lib/format-money.js'

export function GoalGaugesCard({
  title,
  icon,
  goals,
  locale,
  ariaLabelFor,
  labels,
}: {
  title: string
  icon: React.ReactNode
  goals: Goal[]
  locale: string
  ariaLabelFor: (goal: Goal) => string
  labels: { empty: string; currencyMismatch: string }
}) {
  const targeted = goals.filter((goal) => goal.targetBalance !== '0.00')

  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {targeted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          targeted.map((goal) => (
            <div key={goal.id} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm">
                <span className="truncate">{goal.name}</span>
                {}
                {goal.accountCurrency !== goal.currency ? (
                  <Badge variant="outline">{labels.currencyMismatch}</Badge>
                ) : null}
              </span>
              <GaugeBar
                value={Number(goal.balance)}
                max={Number(goal.targetBalance)}
                format={(amount) =>
                  formatMoney(String(amount), locale, goal.currency)
                }
                colorFor={(pct) =>
                  `rgba(34, 197, 94, ${(pct / 100).toFixed(2)})`
                }
                aria-label={ariaLabelFor(goal)}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
