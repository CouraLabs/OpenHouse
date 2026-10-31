import { CalendarDays, Scale, TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TransactionSummaryGroup } from '@workspace/dto'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from 'cn'

import { formatMoney } from '@/lib/format-money.js'
import { mainCurrencyFirst } from '@/lib/main-currency-first.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useMonthSummary } from '@/components/layout/use-month-summary.js'
import { formattingLocale } from '@/lib/i18n.js'

export function MonthSummaryCard() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const summary = useMonthSummary()
  const groups = mainCurrencyFirst(summary.data?.groups ?? [], mainCurrency)

  return (
    <Card className="gap-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays aria-hidden className="size-4" />
          {t('main.month-summary')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        {summary.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : summary.isError ? (
          <p className="text-sm text-destructive">{t('main.month-error')}</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('main.month-empty')}</p>
        ) : (
          groups.map((group) => (
            <CurrencyGroup key={group.currency} group={group} />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function CurrencyGroup({ group }: { group: TransactionSummaryGroup }) {
  const { t } = useTranslation()
  const netNegative = group.net.startsWith('-')

  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 [&:not(:first-child)]:border-t">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {group.currency}
      </span>
      <SummaryLine
        icon={<TrendingUp aria-hidden className="size-3.5" />}
        label={t('main.incomes')}
        amount={formatMoney(group.incomes, formattingLocale(), group.currency)}
        className="text-primary"
      />
      <SummaryLine
        icon={<TrendingDown aria-hidden className="size-3.5" />}
        label={t('main.expenses')}
        amount={formatMoney(group.expenses, formattingLocale(), group.currency)}
        className="text-destructive"
      />
      <SummaryLine
        icon={<Scale aria-hidden className="size-3.5" />}
        label={t('main.net')}
        amount={formatMoney(group.net, formattingLocale(), group.currency)}
        className={cn(
          'border-t pt-2',
          netNegative ? 'text-destructive' : 'text-primary'
        )}
      />
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
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn('text-lg font-semibold tabular-nums', className)}>
        {amount}
      </span>
    </div>
  )
}
