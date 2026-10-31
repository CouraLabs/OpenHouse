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

import type { RentVsBuyRow } from '@workspace/dto'
import { formattingLocale } from '@/lib/i18n.js'

const PROPERTY_COLOR = '#2a78d6'
const INVESTMENT_COLOR = '#eb6834'

interface RentVsBuyChartProps {
  rows: RentVsBuyRow[]
  sampleStep: number
}

export function RentVsBuyChart({ rows, sampleStep }: RentVsBuyChartProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()

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
              values: sampled.map((row) => Number(row.propertyValue)),
            },
            {
              key: 'investment',
              label: t('rent-vs-buy.chart.investment'),
              color: INVESTMENT_COLOR,
              values: sampled.map((row) => Number(row.investment)),
            },
          ]}
          formatValue={(value) =>
            formatMoney(String(value), formattingLocale(), mainCurrency)
          }
          formatTick={compactMoney(formattingLocale(), mainCurrency)}
        />
      </CardContent>
    </Card>
  )
}
