import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { CdiExample } from './cdi-example.js'
import { RateConverter } from './rate-converter.js'

export function RateConversionPage() {
  const { t } = useTranslation()

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('rate-conversion.title')}
        subtitle={t('rate-conversion.subtitle')}
      />
      <RateConverter />
      <CdiExample />
    </main>
  )
}
