import type { TransactionSummaryGroup } from '@workspace/poco'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { CreditCard, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from 'cn'

import { formatMoney } from '@/lib/format-money.js'

/**
 * The summary cards above the grid: one card holding the month's Incomes,
 * Expenses, and Net, and one for Credit Card Expenses — one card row per
 * currency the filtered accounts use, so a mixed-currency tenant never
 * reads a summed-across-currencies number.
 */
export function SummaryCards({
  groups,
  locale,
  labels,
}: {
  groups: TransactionSummaryGroup[]
  /** The BCP-47 tag the money figures format in. */
  locale: string
  /** The card's figures, translated by the page. */
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

/** One currency's two cards. */
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
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {group.currency}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <SummaryLine
            icon={<TrendingUp aria-hidden className="size-4" />}
            label={labels.incomes}
            amount={formatMoney(group.incomes, locale, group.currency)}
            className="text-emerald-600 dark:text-emerald-400"
          />
          <SummaryLine
            icon={<TrendingDown aria-hidden className="size-4" />}
            label={labels.expenses}
            amount={formatMoney(group.expenses, locale, group.currency)}
            className="text-red-600 dark:text-red-400"
          />
          <SummaryLine
            icon={<Scale aria-hidden className="size-4" />}
            label={labels.net}
            amount={formatMoney(group.net, locale, group.currency)}
            className={cn(
              'border-t pt-2',
              netNegative
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            )}
          />
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CreditCard aria-hidden className="size-4" />
            {labels.creditExpenses}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(group.creditExpenses, locale, group.currency)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

/** One figure of the flow card: an icon, the label, and the money. */
function SummaryLine({
  icon,
  label,
  amount,
  className,
}: {
  icon: React.ReactNode
  label: string
  amount: string
  className?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn('text-lg font-semibold tabular-nums', className)}>
        {amount}
      </span>
    </div>
  )
}
