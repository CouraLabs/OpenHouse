import { useTranslation } from 'react-i18next'

import { SidebarFooter } from '@workspace/ui/components/sidebar'
import type { SessionUser } from '@workspace/dto'

import { formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'
import { useMainCurrency } from '@/lib/settings.js'
import { SidebarUser } from './sidebar-user.js'
import { useMonthSummary } from './use-month-summary.js'

export function MonthSummaryFooter({ user }: { user: SessionUser }) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const summary = useMonthSummary()
  const group = summary.data?.groups.find(
    (candidate) => candidate.currency === mainCurrency
  )
  const others = (summary.data?.groups.length ?? 0) - (group ? 1 : 0)

  return (
    <SidebarFooter className="gap-3 pb-3">
      <section
        aria-label={t('sidebar.month-summary')}
        className="flex flex-col gap-2.5 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-sidebar-border group-data-[collapsible=icon]:hidden"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[0.6875rem] font-semibold tracking-[0.12em] text-sidebar-muted uppercase">
            {t('sidebar.month-summary')}
          </span>
          <span className="font-mono text-[0.6875rem] text-sidebar-muted">
            {mainCurrency}
          </span>
        </div>
        {group === undefined ? (
          <p className="text-[0.8125rem] text-sidebar-muted">
            {t('sidebar.month-empty')}
          </p>
        ) : (
          <dl className="flex flex-col gap-1.5 text-[0.8125rem]">
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-sidebar-muted">
                <span
                  aria-hidden
                  className="h-0.5 w-2.5 rounded-full bg-data-in"
                />
                {t('sidebar.incomes')}
              </dt>
              <dd className="font-semibold text-sidebar-foreground">
                {formatMoney(
                  group.incomes,
                  formattingLocale(),
                  group.currency,
                  {
                    signed: true,
                  }
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-2 text-sidebar-muted">
                <span
                  aria-hidden
                  className="h-0.5 w-2.5 rounded-full bg-data-out"
                />
                {t('sidebar.expenses')}
              </dt>
              <dd className="font-semibold text-sidebar-foreground">
                {formatMoney(
                  group.expenses.startsWith('-')
                    ? group.expenses
                    : `-${group.expenses}`,
                  formattingLocale(),
                  group.currency
                )}
              </dd>
            </div>
          </dl>
        )}
        {others > 0 ? (
          <p className="text-xs text-sidebar-muted">
            {t('sidebar.other-currencies', { count: others })}
          </p>
        ) : null}
      </section>
      <SidebarUser user={user} />
    </SidebarFooter>
  )
}
