import type { TransactionSummaryGroup } from '@workspace/dto'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Scale } from 'lucide-react'

import { KpiCard } from '@workspace/ui/components/kpi-card'

import { asOutflow, formatMoney } from '@/lib/format-money.js'

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
  const label = (text: string) => `${text} · ${group.currency}`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={<ArrowDownLeft />}
        tone="in"
        label={label(labels.incomes)}
        value={
          <span className="text-positive">
            {formatMoney(group.incomes, locale, group.currency, {
              signed: true,
            })}
          </span>
        }
      />
      <KpiCard
        icon={<ArrowUpRight />}
        tone="out"
        label={label(labels.expenses)}
        value={formatMoney(asOutflow(group.expenses), locale, group.currency)}
      />
      <KpiCard
        icon={<Scale />}
        tone={group.net.startsWith('-') ? 'warning' : 'primary'}
        label={label(labels.net)}
        value={formatMoney(group.net, locale, group.currency, {
          signed: true,
        })}
      />
      <KpiCard
        icon={<CreditCard />}
        tone="slate"
        label={label(labels.creditExpenses)}
        value={formatMoney(group.creditExpenses, locale, group.currency)}
      />
    </div>
  )
}
