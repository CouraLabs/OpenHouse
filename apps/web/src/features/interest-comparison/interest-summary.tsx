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

/** The props `InterestSummary` takes: the figures at the final period. */
interface InterestSummaryProps {
  simpleCapital: number
  compoundCapital: number
  variation: number
}

/**
 * The three figures the projection ends at: what the principal grew to
 * under simple interest, under compound, and the gap between them — the
 * number the whole comparison is about.
 */
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
              {formatMoney(String(tile.value), formattingLocale(), mainCurrency)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
