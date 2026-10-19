import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { TipGuideCard } from './tip-guide-card.js'
import { TIP_GUIDES } from './tip-guides.js'

/**
 * The financial tips page: the guides' content is static, so there is no
 * data to fetch — the page renders every guide as a card in a responsive
 * grid, with the shell owning the chrome around it.
 */
export function TipsPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader title={t('tips.title')} subtitle={t('tips.subtitle')} />
      <div className="grid gap-4 lg:grid-cols-2">
        {TIP_GUIDES.map((guide) => (
          <TipGuideCard key={guide.key} guide={guide} />
        ))}
      </div>
    </main>
  )
}
