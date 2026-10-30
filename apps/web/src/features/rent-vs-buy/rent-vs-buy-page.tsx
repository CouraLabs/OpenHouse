import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/page-header.js'

import { RentVsBuyChart } from './rent-vs-buy-chart.js'
import { RentVsBuyParams } from './rent-vs-buy-params.js'
import { RentVsBuySummary } from './rent-vs-buy-summary.js'
import { RentVsBuyTable } from './rent-vs-buy-table.js'
import { simulateRentVsBuy, type AmortizationSystem } from './simulate.js'

const MAX_TERM = 600

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

  const result = useMemo(
    () =>
      simulateRentVsBuy({
        propertyValue: Number(propertyValue) || 0,
        downPayment: Number(downPayment) || 0,
        annualMortgageRate: (Number(mortgageRate) || 0) / 100,
        propertyAppreciation: (Number(appreciation) || 0) / 100,
        termMonths: Math.min(
          Math.max(Math.round(Number(term) || 0), 1),
          MAX_TERM
        ),
        system,
        monthlyRent: Number(rent) || 0,
        annualReturn: (Number(annualReturn) || 0) / 100,
        rentIncrease: (Number(rentIncrease) || 0) / 100,
      }),
    [
      propertyValue,
      downPayment,
      mortgageRate,
      appreciation,
      term,
      system,
      rent,
      annualReturn,
      rentIncrease,
    ]
  )

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('rent-vs-buy.title')}
        subtitle={t('rent-vs-buy.subtitle')}
      />
      <RentVsBuyParams
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
      <RentVsBuySummary result={result} />
      <RentVsBuyChart
        rows={result.rows}
        sampleStep={Math.max(
          1,
          Math.ceil((result.rows.length - 1) / MAX_CHART_POINTS)
        )}
      />
      <RentVsBuyTable rows={result.rows} />
    </main>
  )
}
