import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { AccumulationCard } from './accumulation-card.js'
import { WithdrawalCard } from './withdrawal-card.js'

/**
 * The financial-independence calculators, ported from the Mobills
 * spreadsheet: the monthly contribution that reaches a target, and the
 * monthly withdrawal an accumulated balance supports. Everything lives in
 * local state — nothing is saved anywhere.
 */
export function FinancialIndependencePage() {
  const { t } = useTranslation()

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('financial-independence.title')}
        subtitle={t('financial-independence.subtitle')}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AccumulationCard />
        <WithdrawalCard />
      </div>
    </main>
  )
}
