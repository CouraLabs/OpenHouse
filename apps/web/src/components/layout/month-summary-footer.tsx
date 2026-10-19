import { TrendingDown, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SidebarFooter } from '@workspace/ui/components/sidebar'

import { formatMoney } from '@/lib/format-money.js'
import { mainCurrencyFirst } from '@/lib/main-currency-first.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useMonthSummary } from './use-month-summary.js'

/**
 * The sidebar's foot: this month's income and expenses across the tenant's
 * accounts, one pair per currency, the main currency first.
 */
export function MonthSummaryFooter() {
  const { t, i18n } = useTranslation()
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
          groups.map((group) => (
            <div key={group.currency} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp aria-hidden className="size-3.5" />
                  {t('sidebar.incomes')}
                </span>
                <span className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
                  {formatMoney(group.incomes, i18n.language, group.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingDown aria-hidden className="size-3.5" />
                  {t('sidebar.expenses')}
                </span>
                <span className="font-semibold text-red-600 tabular-nums dark:text-red-400">
                  {formatMoney(group.expenses, i18n.language, group.currency)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </SidebarFooter>
  )
}
