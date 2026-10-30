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

export interface SummaryLabels {
  incomes: string
  expenses: string
  net: string
  creditExpenses: string
}

export function SummaryRow({
  group,
  locale,
  labels,
}: {
  group: TransactionSummaryGroup
  locale: string
  labels: SummaryLabels
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
            className="text-primary"
          />
          <SummaryLine
            icon={<TrendingDown aria-hidden className="size-4" />}
            label={labels.expenses}
            amount={formatMoney(group.expenses, locale, group.currency)}
            className="text-destructive"
          />
          <SummaryLine
            icon={<Scale aria-hidden className="size-4" />}
            label={labels.net}
            amount={formatMoney(group.net, locale, group.currency)}
            className={cn(
              'border-t pt-2',
              netNegative
                ? 'text-destructive'
                : 'text-primary'
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
