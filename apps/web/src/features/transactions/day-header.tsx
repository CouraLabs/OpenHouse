import { formatMoney } from '@/lib/format-money.js'
import type { DayGroup } from './group-by-day.js'
import type { TransactionGridLabels } from './transaction-grid.js'

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
    <div
      role="row"
      className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-b bg-muted/60 px-3 py-1.5 text-sm font-medium"
    >
      <span role="cell">{title}</span>
      <span
        role="cell"
        className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground md:text-sm"
      >
        {group.totals.map((total) => (
          <span key={total.currency} className="flex gap-3">
            {isZero(total.incomes) ? null : (
              <span>
                {labels.groupIncomes}{' '}
                <span className="text-primary">
                  {formatMoney(total.incomes, locale, total.currency)}
                </span>
              </span>
            )}
            {isZero(total.expenses) ? null : (
              <span>
                {labels.groupExpenses}{' '}
                <span className="text-destructive">
                  {formatMoney(total.expenses, locale, total.currency)}
                </span>
              </span>
            )}
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

function isZero(amount: string): boolean {
  return /^-?0*(\.0*)?$/.test(amount)
}
