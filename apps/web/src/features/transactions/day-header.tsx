import { formatMoney } from '@/lib/format-money.js'
import type { DayGroup } from './group-by-day.js'
import type { TransactionGridLabels } from './transaction-grid.js'

/** One day's header: the date, and the day's Incomes / Expenses / Net per
 * currency — one block per currency the day carries. */
export function DayHeader({
  group,
  locale,
  labels,
}: {
  group: DayGroup
  locale: string
  labels: TransactionGridLabels
}) {
  const title = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${group.day}T00:00:00`))

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b bg-muted/60 px-3 py-1.5 text-sm font-medium">
      <span>{title}</span>
      <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground md:text-sm">
        {group.totals.map((total) => (
          <span key={total.currency} className="flex gap-3">
            <span>
              {labels.groupIncomes}{' '}
              <span className="text-primary">
                {formatMoney(total.incomes, locale, total.currency)}
              </span>
            </span>
            <span>
              {labels.groupExpenses}{' '}
              <span className="text-destructive">
                {formatMoney(total.expenses, locale, total.currency)}
              </span>
            </span>
            <span>
              {labels.groupNet}{' '}
              <span className="tabular-nums">
                {formatMoney(total.net, locale, total.currency)}
              </span>
            </span>
          </span>
        ))}
      </span>
    </div>
  )
}
