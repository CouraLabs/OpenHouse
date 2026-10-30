import type { TransactionSummaryGroup } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CalendarDays, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from 'cn'

import { formatMoney } from '@/lib/format-money.js'

export function LastMonthCard({
  title,
  groups,
  locale,
  labels,
}: {
  title: string
  groups: TransactionSummaryGroup[]
  locale: string
  labels: { incomes: string; expenses: string }
}) {
  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays aria-hidden className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          groups.map((group) => (
            <div key={group.currency} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp aria-hidden className="size-4" />
                  {labels.incomes}
                </span>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {formatMoney(group.incomes, locale, group.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingDown aria-hidden className="size-4" />
                  {labels.expenses}
                </span>
                <span
                  className={cn(
                    'text-sm font-semibold text-destructive tabular-nums'
                  )}
                >
                  {formatMoney(group.expenses, locale, group.currency)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
