import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { ProjectionLineChart } from '@workspace/ui/components/projection-line-chart'

import { compactMoney } from '@/lib/finance.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'

import type { RentVsBuyRow } from './simulate.js'

/**
 * The series colors, the validated categorical palette's first two slots —
 * the property takes blue, the rented-and-invested balance takes orange,
 * in a fixed order.
 */
const PROPERTY_COLOR = '#2a78d6'
const INVESTMENT_COLOR = '#eb6834'

/** The props `RentVsBuyChart` takes. */
interface RentVsBuyChartProps {
  rows: RentVsBuyRow[]
  /** Every nth row the chart keeps — the curves sample past 150 points. */
  sampleStep: number
}

/**
 * The two patrimonies side by side, month by month: what the property is
 * worth against what the renter's invested balance has grown to.
 */
export function RentVsBuyChart({ rows, sampleStep }: RentVsBuyChartProps) {
  const { t, i18n } = useTranslation()
  const mainCurrency = useMainCurrency()

  // The sample keeps the first row and always the last, so the curves end
  // at the month the summary quotes.
  const sampled =
    sampleStep <= 1
      ? rows
      : rows.filter(
          (_, index) => index % sampleStep === 0 || index === rows.length - 1
        )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('rent-vs-buy.chart.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectionLineChart
          ariaLabel={t('rent-vs-buy.chart.title')}
          xLabels={sampled.map((row) => String(row.month))}
          series={[
            {
              key: 'property',
              label: t('rent-vs-buy.chart.property'),
              color: PROPERTY_COLOR,
              values: sampled.map((row) => row.propertyValue),
            },
            {
              key: 'investment',
              label: t('rent-vs-buy.chart.investment'),
              color: INVESTMENT_COLOR,
              values: sampled.map((row) => row.investment),
            },
          ]}
          formatValue={(value) =>
            formatMoney(String(value), i18n.language, mainCurrency)
          }
          formatTick={compactMoney(i18n.language, mainCurrency)}
        />
      </CardContent>
    </Card>
  )
}
