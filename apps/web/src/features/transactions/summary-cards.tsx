import type { TransactionSummaryGroup } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { cn } from 'cn'

import { formatMoney } from '@/lib/format-money.js'

/**
 * The summary cards above the grid: Incomes, Expenses, Net, and Credit
 * Expenses — one card row per currency the filtered accounts use, so a
 * mixed-currency tenant never reads a summed-across-currencies number.
 */
export function SummaryCards({
  groups,
  locale,
  labels,
}: {
  groups: TransactionSummaryGroup[]
  /** The BCP-47 tag the money figures format in. */
  locale: string
  /** The four card titles, translated by the page. */
  labels: {
    incomes: string
    expenses: string
    net: string
    creditExpenses: string
  }
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <SummaryRow
          key={group.currency}
          group={group}
          locale={locale}
          labels={labels}
        />
      ))}
    </div>
  )
}

/** One currency's four cards. */
function SummaryRow({
  group,
  locale,
  labels,
}: {
  group: TransactionSummaryGroup
  locale: string
  labels: {
    incomes: string
    expenses: string
    net: string
    creditExpenses: string
  }
}) {
  const netNegative = group.net.startsWith('-')

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SummaryCard
        title={labels.incomes}
        amount={formatMoney(group.incomes, locale, group.currency)}
        className="text-emerald-600 dark:text-emerald-400"
      />
      <SummaryCard
        title={labels.expenses}
        amount={formatMoney(group.expenses, locale, group.currency)}
        className="text-red-600 dark:text-red-400"
      />
      <SummaryCard
        title={labels.net}
        amount={formatMoney(group.net, locale, group.currency)}
        className={cn(
          netNegative
            ? 'text-red-600 dark:text-red-400'
            : 'text-emerald-600 dark:text-emerald-400'
        )}
      />
      <SummaryCard
        title={labels.creditExpenses}
        amount={formatMoney(group.creditExpenses, locale, group.currency)}
      />
    </div>
  )
}

/** One card: a title and a money figure. */
function SummaryCard({
  title,
  amount,
  className,
}: {
  title: string
  amount: string
  className?: string
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={cn('text-2xl font-semibold tabular-nums', className)}>
          {amount}
        </p>
      </CardContent>
    </Card>
  )
}
