import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { MoneyField } from '@workspace/ui/components/money-field'
import { NumberField } from '@workspace/ui/components/number-field'

import { pmt, realRate } from '@/lib/finance.js'
import { formatMoney } from '@/lib/format-money.js'

/**
 * Living off the accumulation: the constant monthly withdrawal an
 * accumulated balance supports over the span, net of the income tax the
 * gains pay — the sheet charged the tax on the interest share only, so
 * the first month's net interest is quoted beside the withdrawal.
 */
export function WithdrawalCard() {
  const { t, i18n } = useTranslation()
  const [balance, setBalance] = useState('2000000.00')
  const [rate, setRate] = useState('0.6')
  const [inflation, setInflation] = useState('0')
  const [adminFee, setAdminFee] = useState('0')
  const [incomeTax, setIncomeTax] = useState('15')
  const [years, setYears] = useState('20')

  const months = Math.max(Math.round(Number(years) || 0), 0) * 12
  const monthlyRate = realRate(
    (Number(rate) || 0) / 100,
    ((Number(inflation) || 0) + (Number(adminFee) || 0)) / 100
  )
  const tax = (Number(incomeTax) || 0) / 100
  const pv = Number(balance) || 0

  const base = months > 0 ? -pmt(monthlyRate, months, pv) : 0
  const withdrawal = base * (1 - monthlyRate * tax)
  const firstInterest = pv * monthlyRate * (1 - tax)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('financial-independence.withdrawal.title')}
        </CardTitle>
        <CardDescription>
          {t('financial-independence.withdrawal.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MoneyField
            locale={i18n.language}
            className="h-8"
            label={t('financial-independence.withdrawal.balance')}
            labelFor="withdrawal-balance"
            value={balance}
            onValueChange={setBalance}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.rate')}
            labelFor="withdrawal-rate"
            value={rate}
            onValueChange={setRate}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.inflation')}
            labelFor="withdrawal-inflation"
            value={inflation}
            onValueChange={setInflation}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.admin-fee')}
            labelFor="withdrawal-admin-fee"
            value={adminFee}
            onValueChange={setAdminFee}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.income-tax')}
            labelFor="withdrawal-income-tax"
            value={incomeTax}
            onValueChange={setIncomeTax}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.years')}
            labelFor="withdrawal-years"
            value={years}
            onValueChange={setYears}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div>
            <span className="text-sm text-muted-foreground">
              {t('financial-independence.withdrawal.result')}
            </span>
            <p className="text-2xl font-semibold">
              {formatMoney(String(withdrawal), i18n.language)}
            </p>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t('financial-independence.withdrawal.first-interest')}
            </span>
            <span className="font-medium tabular-nums">
              {formatMoney(String(firstInterest), i18n.language)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
