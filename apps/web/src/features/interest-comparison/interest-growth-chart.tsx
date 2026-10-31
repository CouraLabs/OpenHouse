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

import type { InterestRow } from '@workspace/dto'
import { formattingLocale } from '@/lib/i18n.js'

const SIMPLE_COLOR = 'var(--chart-1)'
const COMPOUND_COLOR = 'var(--chart-2)'

interface InterestGrowthChartProps {
  rows: InterestRow[]
  sampleStep: number
}

export function InterestGrowthChart({
  rows,
  sampleStep,
}: InterestGrowthChartProps) {
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
          {t('interest-comparison.chart.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ProjectionLineChart
          ariaLabel={t('interest-comparison.chart.title')}
          xLabels={sampled.map((row) => String(row.period))}
          series={[
            {
              key: 'simple',
              label: t('interest-comparison.chart.simple'),
              color: SIMPLE_COLOR,
              values: sampled.map((row) => Number(row.simpleCapital)),
            },
            {
              key: 'compound',
              label: t('interest-comparison.chart.compound'),
              color: COMPOUND_COLOR,
              values: sampled.map((row) => Number(row.compoundCapital)),
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
