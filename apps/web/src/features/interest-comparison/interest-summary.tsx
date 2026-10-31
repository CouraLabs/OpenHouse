import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'
import { formattingLocale } from '@/lib/i18n.js'

interface InterestSummaryProps {
  simpleCapital: string
  compoundCapital: string
  variation: string
}

export function InterestSummary({
  simpleCapital,
  compoundCapital,
  variation,
}: InterestSummaryProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()

  const tiles = [
    { label: t('interest-comparison.summary.simple'), value: simpleCapital },
    {
      label: t('interest-comparison.summary.compound'),
      value: compoundCapital,
    },
    {
      label: t('interest-comparison.summary.difference'),
      value: variation,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} className="gap-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tile.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatMoney(
                String(tile.value),
                formattingLocale(),
                mainCurrency
              )}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
