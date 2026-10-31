import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  interestInputSchema,
  type InterestProjection,
  type InterestUnit,
} from '@workspace/dto'

import { PageHeader } from '@/components/page-header.js'
import { fieldErrorsOf } from '@/lib/field-errors.js'
import { useTipCalculation } from '@/lib/tip-calculation.js'

import { InterestGrowthChart } from './interest-growth-chart.js'
import { InterestParams } from './interest-params.js'
import { InterestSummary } from './interest-summary.js'
import { InterestTable } from './interest-table.js'

const MAX_CHART_POINTS = 150

export function InterestComparisonPage() {
  const { t } = useTranslation()

  const [presentValue, setPresentValue] = useState('15000.00')
  const [rate, setRate] = useState('10')
  const [periods, setPeriods] = useState('15')
  const [unit, setUnit] = useState<InterestUnit>('year')

  const parsed = interestInputSchema.safeParse({
    presentValue,
    rate,
    periods,
    unit,
  })
  const projection = useTipCalculation<InterestProjection>(
    'interest',
    parsed.success ? parsed.data : undefined
  )
  const rows = parsed.success ? (projection.data?.rows ?? []) : []
  const last = rows.at(-1)

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('interest-comparison.title')}
        subtitle={t('interest-comparison.subtitle')}
      />
      <InterestParams
        errors={parsed.success ? {} : fieldErrorsOf(parsed.error)}
        presentValue={presentValue}
        rate={rate}
        periods={periods}
        unit={unit}
        onPresentValueChange={setPresentValue}
        onRateChange={setRate}
        onPeriodsChange={setPeriods}
        onUnitChange={setUnit}
      />
      {last !== undefined ? (
        <InterestSummary
          simpleCapital={last.simpleCapital}
          compoundCapital={last.compoundCapital}
          variation={last.variation}
        />
      ) : null}
      <InterestGrowthChart
        rows={rows}
        sampleStep={Math.max(
          1,
          Math.ceil((rows.length - 1) / MAX_CHART_POINTS)
        )}
      />
      <InterestTable rows={rows} />
    </main>
  )
}
