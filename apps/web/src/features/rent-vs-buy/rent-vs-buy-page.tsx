import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  rentVsBuyInputSchema,
  type AmortizationSystem,
  type RentVsBuyResult,
} from '@workspace/dto'

import { PageHeader } from '@/components/page-header.js'
import { fieldErrorsOf } from '@/lib/field-errors.js'
import { useTipCalculation } from '@/lib/tip-calculation.js'

import { RentVsBuyChart } from './rent-vs-buy-chart.js'
import { RentVsBuyParams } from './rent-vs-buy-params.js'
import { RentVsBuySummary } from './rent-vs-buy-summary.js'
import { RentVsBuyTable } from './rent-vs-buy-table.js'

const MAX_CHART_POINTS = 150

export function RentVsBuyPage() {
  const { t } = useTranslation()

  const [propertyValue, setPropertyValue] = useState('400000.00')
  const [downPayment, setDownPayment] = useState('50000.00')
  const [mortgageRate, setMortgageRate] = useState('12')
  const [appreciation, setAppreciation] = useState('4')
  const [term, setTerm] = useState('360')
  const [system, setSystem] = useState<AmortizationSystem>('SAC')
  const [rent, setRent] = useState('2000.00')
  const [annualReturn, setAnnualReturn] = useState('12')
  const [rentIncrease, setRentIncrease] = useState('4')

  const parsed = rentVsBuyInputSchema.safeParse({
    propertyValue,
    downPayment,
    mortgageRate,
    propertyAppreciation: appreciation,
    termMonths: term,
    system,
    monthlyRent: rent,
    investmentReturn: annualReturn,
    rentIncrease,
  })
  const calculation = useTipCalculation<RentVsBuyResult>(
    'rent-vs-buy',
    parsed.success ? parsed.data : undefined
  )
  const result = parsed.success ? calculation.data : undefined

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('rent-vs-buy.title')}
        subtitle={t('rent-vs-buy.subtitle')}
      />
      <RentVsBuyParams
        errors={parsed.success ? {} : fieldErrorsOf(parsed.error)}
        propertyValue={propertyValue}
        downPayment={downPayment}
        mortgageRate={mortgageRate}
        appreciation={appreciation}
        term={term}
        system={system}
        rent={rent}
        annualReturn={annualReturn}
        rentIncrease={rentIncrease}
        onPropertyValueChange={setPropertyValue}
        onDownPaymentChange={setDownPayment}
        onMortgageRateChange={setMortgageRate}
        onAppreciationChange={setAppreciation}
        onTermChange={setTerm}
        onSystemChange={setSystem}
        onRentChange={setRent}
        onAnnualReturnChange={setAnnualReturn}
        onRentIncreaseChange={setRentIncrease}
      />
      {result !== undefined ? (
        <>
          <RentVsBuySummary result={result} />
          <RentVsBuyChart
            rows={result.rows}
            sampleStep={Math.max(
              1,
              Math.ceil((result.rows.length - 1) / MAX_CHART_POINTS)
            )}
          />
          <RentVsBuyTable rows={result.rows} />
        </>
      ) : null}
    </main>
  )
}
