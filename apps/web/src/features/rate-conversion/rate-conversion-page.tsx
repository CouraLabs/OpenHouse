import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { CdiExample } from './cdi-example.js'
import { RateConverter } from './rate-converter.js'

export function RateConversionPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('rate-conversion.title')}
        subtitle={t('rate-conversion.subtitle')}
      />
      <RateConverter />
      <CdiExample />
    </main>
  )
}
