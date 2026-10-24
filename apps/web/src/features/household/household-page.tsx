import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SettleSuggestion } from '@workspace/poco'

import { PageHeader } from '@/components/page-header.js'
import { formatMoney } from '@/lib/format-money.js'
import { useHouseholdOverview } from '@/lib/household.js'
import { BalancesCard } from './balances-card.js'
import { SettleDialog } from './settle-dialog.js'
import { SettlementsCard } from './settlements-card.js'
import { SpendingCard } from './spending-card.js'

/** No window: spending covers everything the household recorded. */
const ALL_TIME = {}

/**
 * The Household page: what each member and category bore, the balances
 * between members with the settle-up suggestions, and the history of
 * settlements.
 */
export function HouseholdPage() {
  const { t, i18n } = useTranslation()
  const overview = useHouseholdOverview(ALL_TIME)
  const [settling, setSettling] = useState<SettleSuggestion | null>(null)
  const data = overview.data

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('household.title')}
        subtitle={t('household.subtitle')}
      />
      {data === undefined ? (
        <p className="text-sm text-muted-foreground">
          {t('household.loading')}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <BalancesCard
            balances={data.balances}
            suggestions={data.suggestions}
            onSettle={setSettling}
          />
          <SettlementsCard settlements={data.settlements} />
          <SpendingCard
            title={t('household.by-member')}
            empty={t('household.spending-empty')}
            lines={data.byMember.map((row) => ({
              key: `${row.userId}-${row.currency}`,
              label: row.userName,
              total: formatMoney(row.total, i18n.language, row.currency),
            }))}
          />
          <SpendingCard
            title={t('household.by-category')}
            empty={t('household.spending-empty')}
            lines={data.byCategory.map((row) => ({
              key: `${row.categoryId}-${row.currency}`,
              label: row.categoryName,
              color: row.categoryColor,
              total: formatMoney(row.total, i18n.language, row.currency),
            }))}
          />
        </div>
      )}
      <SettleDialog suggestion={settling} onClose={() => setSettling(null)} />
    </main>
  )
}
