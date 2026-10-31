import { ArrowDownLeft, ArrowUpRight, ReceiptText, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UpcomingResponse } from '@workspace/dto'

import { KpiCard } from '@workspace/ui/components/kpi-card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { StatusPill } from '@workspace/ui/components/status-pill'

import { useMonthSummary } from '@/components/layout/use-month-summary.js'
import { formatDayLabel } from '@/lib/format-date-only.js'
import { asOutflow, formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useMainCurrency } from '@/lib/settings.js'

export function HomeKpis({
  upcoming,
}: {
  upcoming: UpcomingResponse | undefined
}) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const summary = useMonthSummary()
  const month = summary.data?.groups.find(
    (group) => group.currency === mainCurrency
  )
  const total = upcoming?.balances.find(
    (line) => line.accountId === null && line.currency === mainCurrency
  )
  const bills = (upcoming?.items ?? []).filter((item) => item.kind === 'bill')
  const late = bills.filter((item) => item.kind === 'bill' && item.overdue)
  const locale = formattingLocale()
  const loading = <Skeleton className="h-8 w-32" />

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <KpiCard
        icon={<Wallet />}
        tone="primary"
        label={t('home.kpi-balance')}
        value={
          total === undefined
            ? upcoming === undefined
              ? loading
              : formatMoney('0', locale, mainCurrency)
            : formatMoney(total.startBalance, locale, total.currency)
        }
        footnote={
          total !== undefined && upcoming !== undefined
            ? t('home.kpi-balance-by', {
                amount: formatMoney(total.endBalance, locale, total.currency),
                date: formatDayLabel(upcoming.to, locale),
              })
            : undefined
        }
      />
      <KpiCard
        icon={<ArrowDownLeft />}
        tone="in"
        label={t('home.kpi-in')}
        value={
          month === undefined
            ? summary.isPending
              ? loading
              : formatMoney('0', locale, mainCurrency)
            : (
                <span className="text-positive">
                  {formatMoney(month.incomes, locale, month.currency, {
                    signed: true,
                  })}
                </span>
              )
        }
        footnote={t('home.kpi-month-so-far')}
      />
      <KpiCard
        icon={<ArrowUpRight />}
        tone="out"
        label={t('home.kpi-out')}
        value={
          month === undefined
            ? summary.isPending
              ? loading
              : formatMoney('0', locale, mainCurrency)
            : formatMoney(asOutflow(month.expenses), locale, month.currency)
        }
        footnote={t('home.kpi-month-so-far')}
      />
      <KpiCard
        icon={<ReceiptText />}
        tone={late.length > 0 ? 'negative' : 'blue'}
        label={t('home.kpi-bills')}
        value={upcoming === undefined ? loading : String(bills.length)}
        pill={
          late.length > 0 ? (
            <StatusPill tone="negative" dot>
              {t('home.kpi-bills-late', { count: late.length })}
            </StatusPill>
          ) : undefined
        }
        footnote={
          late.length === 0 && upcoming !== undefined
            ? t('home.kpi-bills-window')
            : undefined
        }
      />
    </div>
  )
}
