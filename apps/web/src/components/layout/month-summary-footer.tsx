import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SidebarFooter } from '@workspace/ui/components/sidebar'

import { formatMoney } from '@/lib/format-money.js'
import { mainCurrencyFirst } from '@/lib/main-currency-first.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useMonthSummary } from './use-month-summary.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The sidebar's foot: this month's income and expenses across the household's
 * accounts, one tagged group per currency, the main currency first.
 */
export function MonthSummaryFooter() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const summary = useMonthSummary()
  const groups = mainCurrencyFirst(summary.data?.groups ?? [], mainCurrency)

  return (
    <SidebarFooter className="group-data-[collapsible=icon]:hidden">
      <div className="flex flex-col gap-2 rounded-2xl border border-sidebar-border p-3">
        <span className="text-xs font-medium text-sidebar-foreground/70">
          {t('sidebar.month-summary')}
        </span>
        {groups.length === 0 ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          groups.map((group, index) => (
            <div
              key={group.currency}
              className={
                index === 0
                  ? 'flex flex-col gap-1'
                  : 'flex flex-col gap-1 border-t border-sidebar-border pt-2'
              }
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {group.currency}
              </span>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp aria-hidden className="size-3.5" />
                  {t('sidebar.incomes')}
                </span>
                <span className="font-semibold text-primary tabular-nums">
                  {formatMoney(group.incomes, formattingLocale(), group.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown aria-hidden className="size-3.5" />
                  {t('sidebar.expenses')}
                </span>
                <span className="font-semibold text-destructive tabular-nums">
                  {formatMoney(group.expenses, formattingLocale(), group.currency)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </SidebarFooter>
  )
}
