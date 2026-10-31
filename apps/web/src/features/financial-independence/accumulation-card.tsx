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
import {
  accumulationInputSchema,
  type AccumulationResult,
} from '@workspace/dto'

import { fieldErrorsOf, type FieldErrors } from '@/lib/field-errors.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useTipCalculation } from '@/lib/tip-calculation.js'
import { formattingLocale } from '@/lib/i18n.js'

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

  const parsed = accumulationInputSchema.safeParse({
    target,
    present,
    rate,
    inflation,
    adminFee,
    loadingFee,
    incomeTax,
    years,
  })
  const errors: FieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error)
  const calculation = useTipCalculation<AccumulationResult>(
    'accumulation',
    parsed.success ? parsed.data : undefined
  )
  const figures = parsed.success ? calculation.data : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('financial-independence.accumulation.title')}</CardTitle>
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
            error={errors.target}
          />
          <MoneyField
            locale={formattingLocale()}
            className="h-8"
            label={t('financial-independence.accumulation.present')}
            labelFor="accumulation-present"
            value={present}
            onValueChange={setPresent}
            error={errors.present}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.rate')}
            labelFor="accumulation-rate"
            value={rate}
            onValueChange={setRate}
            error={errors.rate}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.inflation')}
            labelFor="accumulation-inflation"
            value={inflation}
            onValueChange={setInflation}
            error={errors.inflation}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.admin-fee')}
            labelFor="accumulation-admin-fee"
            value={adminFee}
            onValueChange={setAdminFee}
            error={errors.adminFee}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.loading-fee')}
            labelFor="accumulation-loading-fee"
            value={loadingFee}
            onValueChange={setLoadingFee}
            error={errors.loadingFee}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.income-tax')}
            labelFor="accumulation-income-tax"
            value={incomeTax}
            onValueChange={setIncomeTax}
            error={errors.incomeTax}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.accumulation.years')}
            labelFor="accumulation-years"
            value={years}
            onValueChange={setYears}
            error={errors.years}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div>
            <span className="text-sm text-muted-foreground">
              {t('financial-independence.accumulation.result')}
            </span>
            <p className="text-2xl font-semibold">
              {figures
                ? formatMoney(
                    figures.monthlyContribution,
                    formattingLocale(),
                    mainCurrency
                  )
                : '—'}
            </p>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t('financial-independence.accumulation.contributed')}
            </span>
            <span className="font-medium tabular-nums">
              {figures
                ? formatMoney(
                    figures.totalContributed,
                    formattingLocale(),
                    mainCurrency
                  )
                : '—'}
            </span>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t('financial-independence.accumulation.tax')}
            </span>
            <span className="font-medium tabular-nums">
              {figures
                ? formatMoney(
                    figures.totalIncomeTax,
                    formattingLocale(),
                    mainCurrency
                  )
                : '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
