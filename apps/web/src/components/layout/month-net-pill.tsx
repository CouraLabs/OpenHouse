import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useMonthSummary } from './use-month-summary.js'

export function MonthNetPill() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const summary = useMonthSummary()
  const group = summary.data?.groups.find(
    (candidate) => candidate.currency === mainCurrency
  )

  if (group === undefined) {
    return null
  }

  const down = group.net.startsWith('-')
  const Trend = down ? TrendingDown : TrendingUp

  return (
    <div
      className="flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-[0.8125rem] shadow-[0_1px_2px_rgb(0_0_0/0.04)] max-lg:hidden dark:border-input dark:shadow-none"
      title={t('shell.month-net-hint')}
    >
      <span
        aria-hidden
        className="relative flex size-2 items-center justify-center"
      >
        <span className="absolute size-2 animate-ping rounded-full bg-data-in opacity-40 motion-reduce:hidden" />
        <span className="size-2 rounded-full bg-data-in" />
      </span>
      <span className="text-muted-foreground">{t('shell.month-net')}</span>
      <span className="font-semibold">
        {formatMoney(group.net, formattingLocale(), group.currency, {
          signed: true,
        })}
      </span>
      <Trend
        aria-label={down ? t('shell.trend-down') : t('shell.trend-up')}
        className={down ? 'size-4 text-warning' : 'size-4 text-positive'}
      />
    </div>
  )
}
