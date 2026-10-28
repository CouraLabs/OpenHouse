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
import { useMainCurrency } from '@/lib/settings.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * Reaching a target: the monthly contribution that turns today's balance
 * into the target over the span, with the drags the sheet modeled —
 * inflation and the admin fee eating the return, a loading fee on the
 * contributions, and income tax on the gains.
 */
export function AccumulationCard() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const [target, setTarget] = useState('2000000.00')
  const [present, setPresent] = useState('25000.00')
  const [rate, setRate] = useState('0.8')
  const [inflation, setInflation] = useState('0.2')
  const [adminFee, setAdminFee] = useState('0')
  const [loadingFee, setLoadingFee] = useState('0')
  const [incomeTax, setIncomeTax] = useState('15')
  const [years, setYears] = useState('40')

  const months = Math.max(Math.round(Number(years) || 0), 0) * 12
  // The return net of the monthly drags, exactly as the sheet composed it.
  const monthlyRate = realRate(
    (Number(rate) || 0) / 100,
    ((Number(inflation) || 0) + (Number(adminFee) || 0)) / 100
  )
  const loading = (Number(loadingFee) || 0) / 100
  const tax = (Number(incomeTax) || 0) / 100
  const pv = (Number(present) || 0) * (1 - loading)
  const fv = Number(target) || 0

  // The sheet's contribution: the annuity payment grossed up by the
  // loading fee, plus the income tax on the gains spread over the months —
  // the tax share is part of what leaves the pocket monthly.
  const base = months > 0 ? -pmt(monthlyRate, months, -pv, fv) : 0
  const grossContribution = base * (1 + loading)
  const gains = Math.max(fv - grossContribution * months, 0)
  const totalTax = gains * tax
  const contribution = months > 0 ? grossContribution + totalTax / months : 0
  const totalContributed = contribution * months

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('financial-independence.accumulation.title')}
        </CardTitle>
        <CardDescription>
          {t('financial-independence.accumulation.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MoneyField
            locale={formattingLocale()}
            className="h-8"
            label={t('financial-independence.accumulation.target')}
            labelFor="accumulation-target"
            value={target}
            onValueChange={setTarget}
          />
          <MoneyField
            locale={formattingLocale()}
            className="h-8"
            label={t('financial-independence.accumulation.present')}
            labelFor="accumulation-present"
            value={present}
            onValueChange={setPresent}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.rate')}
            labelFor="accumulation-rate"
            value={rate}
            onValueChange={setRate}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.inflation')}
            labelFor="accumulation-inflation"
            value={inflation}
            onValueChange={setInflation}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.admin-fee')}
            labelFor="accumulation-admin-fee"
            value={adminFee}
            onValueChange={setAdminFee}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.loading-fee')}
            labelFor="accumulation-loading-fee"
            value={loadingFee}
            onValueChange={setLoadingFee}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.income-tax')}
            labelFor="accumulation-income-tax"
            value={incomeTax}
            onValueChange={setIncomeTax}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.years')}
            labelFor="accumulation-years"
            value={years}
            onValueChange={setYears}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div>
            <span className="text-sm text-muted-foreground">
              {t('financial-independence.accumulation.result')}
            </span>
            <p className="text-2xl font-semibold">
              {formatMoney(String(contribution), formattingLocale(), mainCurrency)}
            </p>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t('financial-independence.accumulation.contributed')}
            </span>
            <span className="font-medium tabular-nums">
              {formatMoney(
                String(totalContributed),
                formattingLocale(),
                mainCurrency
              )}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t('financial-independence.accumulation.tax')}
            </span>
            <span className="font-medium tabular-nums">
              {formatMoney(String(totalTax), formattingLocale(), mainCurrency)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
