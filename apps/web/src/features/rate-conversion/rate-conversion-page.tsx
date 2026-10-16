import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { CdiExample } from './cdi-example.js'
import { RateConverter } from './rate-converter.js'

/**
 * The rate conversion tool, ported from the Mobills spreadsheets: a rate
 * restated across year, month, and business day by compounding, plus the
 * CDI example that walks the same math the way the market quotes it.
 * Everything lives in local state — nothing is saved anywhere.
 */
export function RateConversionPage() {
  const { t } = useTranslation()

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('rate-conversion.title')}
        subtitle={t('rate-conversion.subtitle')}
      />
      <RateConverter />
      <CdiExample />
    </main>
  )
}
