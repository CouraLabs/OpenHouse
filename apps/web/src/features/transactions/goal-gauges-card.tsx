import type { Goal } from '@workspace/dto'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { RingGauge } from '@workspace/ui/components/ring-gauge'
import { StatusPill } from '@workspace/ui/components/status-pill'

import { formatMoney } from '@/lib/format-money.js'

export function GoalGaugesCard({
  title,
  description,
  icon,
  goals,
  locale,
  ariaLabelFor,
  labels,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  goals: Goal[]
  locale: string
  ariaLabelFor: (goal: Goal) => string
  labels: { empty: string; currencyMismatch: string; of?: string }
}) {
  const targeted = goals.filter((goal) => goal.targetBalance !== '0.00')
  const progressOf = (goal: Goal) =>
    goal.accountCurrency === goal.currency ? goal.accountBalance : '0.00'

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
        {targeted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          targeted.map((goal) => (
            <div
              key={goal.id}
              role="progressbar"
              aria-label={ariaLabelFor(goal)}
              aria-valuemin={0}
              aria-valuemax={Number(goal.targetBalance)}
              aria-valuenow={Number(progressOf(goal))}
              className="flex items-center gap-3"
            >
              <RingGauge
                fraction={Number(progressOf(goal)) / Number(goal.targetBalance)}
                tone="blue"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{goal.name}</span>
                  {goal.accountCurrency !== goal.currency ? (
                    <StatusPill tone="warning">
                      {labels.currencyMismatch}
                    </StatusPill>
                  ) : null}
                </span>
                <span className="text-[0.8125rem] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {formatMoney(progressOf(goal), locale, goal.currency)}
                  </span>
                  {' / '}
                  {labels.of !== undefined ? `${labels.of} ` : ''}
                  {formatMoney(goal.targetBalance, locale, goal.currency)}
                </span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
