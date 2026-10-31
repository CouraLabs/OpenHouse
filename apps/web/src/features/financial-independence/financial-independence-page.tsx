import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { AccumulationCard } from './accumulation-card.js'
import { WithdrawalCard } from './withdrawal-card.js'

export function FinancialIndependencePage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
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
