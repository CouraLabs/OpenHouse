import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SettleSuggestion } from '@workspace/dto'

import { PageHeader } from '@/components/page-header.js'
import { formatMoney } from '@/lib/format-money.js'
import { useHouseholdOverview } from '@/lib/household.js'
import { BalancesCard } from './balances-card.js'
import { SettleDialog } from './settle-dialog.js'
import { SettlementsCard } from './settlements-card.js'
import { SpendingCard } from './spending-card.js'
import { formattingLocale } from '@/lib/i18n.js'

const ALL_TIME = {}

export function HouseholdPage() {
  const { t } = useTranslation()
  const overview = useHouseholdOverview(ALL_TIME)
  const [settling, setSettling] = useState<SettleSuggestion | null>(null)
  const data = overview.data

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
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
              total: formatMoney(row.total, formattingLocale(), row.currency),
            }))}
          />
          <SpendingCard
            title={t('household.by-category')}
            empty={t('household.spending-empty')}
            lines={data.byCategory.map((row) => ({
              key: `${row.categoryId}-${row.currency}`,
              label: row.categoryName,
              color: row.categoryColor,
              total: formatMoney(row.total, formattingLocale(), row.currency),
            }))}
          />
        </div>
      )}
      <SettleDialog suggestion={settling} onClose={() => setSettling(null)} />
    </main>
  )
}
