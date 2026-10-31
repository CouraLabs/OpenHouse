import { asOutflow, formatMoney } from '@/lib/format-money.js'
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
  }).format(new Date(`${group.day}T00:00:00`))

  return (
    <div
      role="row"
      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 border-b bg-card/95 px-4 pt-4 pb-2 backdrop-blur-sm"
    >
      <span
        role="cell"
        className="text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase"
      >
        {title}
      </span>
      <span
        role="cell"
        className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground"
      >
        {group.totals.map((total) => (
          <span key={total.currency} className="flex gap-3">
            {isZero(total.incomes) ? null : (
              <span>
                {labels.groupIncomes}{' '}
                <span className="font-medium text-positive">
                  {formatMoney(total.incomes, locale, total.currency, {
                    signed: true,
                  })}
                </span>
              </span>
            )}
            {isZero(total.expenses) ? null : (
              <span>
                {labels.groupExpenses}{' '}
                <span className="font-medium text-foreground">
                  {formatMoney(
                    asOutflow(total.expenses),
                    locale,
                    total.currency
                  )}
                </span>
              </span>
            )}
            <span>
              {labels.groupNet}{' '}
              <span className="font-semibold text-foreground">
                {formatMoney(total.net, locale, total.currency, {
                  signed: true,
                })}
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
