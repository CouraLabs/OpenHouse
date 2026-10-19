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

/**
 * The goals card: one gauge per goal, from its balance toward its target —
 * the same gauge the goals grid draws, so a goal reads the same on both
 * screens. Goals without a target yet have nothing to fill toward and are
 * left out.
 */
export function GoalGaugesCard({
  title,
  icon,
  goals,
  locale,
  ariaLabelFor,
  labels,
}: {
  title: string
  /** The icon naming what the card shows, rendered beside the title. */
  icon: React.ReactNode
  goals: Goal[]
  locale: string
  /** Names one goal's gauge for assistive technology — translated by the
   * page, which owns the wording. */
  ariaLabelFor: (goal: Goal) => string
  /** The labels the card cannot derive, translated by the page. */
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
                {/* The main currency changed after the goal was set: its
                    account is in another currency, so it no longer tracks. */}
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
                // The greener the fuller: the fill starts with no color near
                // 0 and reaches full green at the target.
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
