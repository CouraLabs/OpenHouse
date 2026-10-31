import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { TipGuideCard } from './tip-guide-card.js'
import { TIP_GUIDES } from './tip-guides.js'

export function TipsPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader title={t('tips.title')} subtitle={t('tips.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        {TIP_GUIDES.map((guide) => (
          <TipGuideCard key={guide.key} guide={guide} />
        ))}
      </div>
    </main>
  )
}
