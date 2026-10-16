import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'
import { periodicRate } from '@/lib/finance.js'

import { InterestGrowthChart } from './interest-growth-chart.js'
import { InterestParams, type InterestUnit } from './interest-params.js'
import { InterestSummary } from './interest-summary.js'
import { InterestTable, type InterestRow } from './interest-table.js'

/** How many periods a projection may span — the sheet the page ports
 * carried rows up to 300. */
const MAX_PERIODS = 300

/** The most points the chart draws: past that it samples the same curve. */
const MAX_CHART_POINTS = 150

/**
 * The simple-vs-compound interest projection, ported from the Mobills
 * spreadsheet: a present value, a net annual rate, and a span of periods —
 * the page holds it all in local state and recomputes on every keystroke;
 * nothing is saved anywhere.
 */
export function InterestComparisonPage() {
  const { t } = useTranslation()

  const [presentValue, setPresentValue] = useState('15000.00')
  const [rate, setRate] = useState('10')
  const [periods, setPeriods] = useState('15')
  const [unit, setUnit] = useState<InterestUnit>('year')

  const rows = useMemo<Array<InterestRow>>(() => {
    const pv = Number(presentValue) || 0
    // The rate is quoted a year; a month period compounds a twelfth of it.
    const perPeriod =
      unit === 'year'
        ? (Number(rate) || 0) / 100
        : periodicRate((Number(rate) || 0) / 100, 'month')
    const count = Math.min(
      Math.max(Math.round(Number(periods) || 0), 0),
      MAX_PERIODS
    )

    const computed: Array<InterestRow> = []

    for (let period = 0; period <= count; period += 1) {
      const simple = pv * (1 + perPeriod * period)
      const compound = pv * (1 + perPeriod) ** period

      computed.push({
        period,
        simpleCapital: simple,
        simpleInterest: simple - pv,
        compoundCapital: compound,
        compoundInterest: compound - pv,
        variation: compound - simple,
      })
    }

    return computed
  }, [presentValue, rate, periods, unit])

  const last = rows.at(-1)

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('interest-comparison.title')}
        subtitle={t('interest-comparison.subtitle')}
      />
      <InterestParams
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
