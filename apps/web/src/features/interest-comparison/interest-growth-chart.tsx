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

import type { InterestRow } from './interest-table.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The series colors, the validated categorical palette's first two slots —
 * simple interest takes blue, compound takes orange, in a fixed order.
 */
const SIMPLE_COLOR = '#2a78d6'
const COMPOUND_COLOR = '#eb6834'

/** The props `InterestGrowthChart` takes. */
interface InterestGrowthChartProps {
  rows: InterestRow[]
  /** Every nth row the chart keeps — the curve samples past 150 points. */
  sampleStep: number
}

/**
 * The capital curves side by side: simple interest's straight line against
 * compound's bend, one point per sampled period. The x axis is the period
 * number itself, so the chart stays language-neutral.
 */
export function InterestGrowthChart({
  rows,
  sampleStep,
}: InterestGrowthChartProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()

  // The sample keeps the first row and always the last, so the curves end
  // at the period the summary quotes.
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
              values: sampled.map((row) => row.simpleCapital),
            },
            {
              key: 'compound',
              label: t('interest-comparison.chart.compound'),
              color: COMPOUND_COLOR,
              values: sampled.map((row) => row.compoundCapital),
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
