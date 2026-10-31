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
import { withdrawalInputSchema, type WithdrawalResult } from '@workspace/dto'

import { fieldErrorsOf, type FieldErrors } from '@/lib/field-errors.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useTipCalculation } from '@/lib/tip-calculation.js'
import { formattingLocale } from '@/lib/i18n.js'

export function WithdrawalCard() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const [balance, setBalance] = useState('2000000.00')
  const [rate, setRate] = useState('0.6')
  const [inflation, setInflation] = useState('0')
  const [adminFee, setAdminFee] = useState('0')
  const [incomeTax, setIncomeTax] = useState('15')
  const [years, setYears] = useState('20')

  const parsed = withdrawalInputSchema.safeParse({
    balance,
    rate,
    inflation,
    adminFee,
    incomeTax,
    years,
  })
  const errors: FieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error)
  const calculation = useTipCalculation<WithdrawalResult>(
    'withdrawal',
    parsed.success ? parsed.data : undefined
  )
  const figures = parsed.success ? calculation.data : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('financial-independence.withdrawal.title')}</CardTitle>
        <CardDescription>
          {t('financial-independence.withdrawal.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <MoneyField
            locale={formattingLocale()}
            className="h-8"
            label={t('financial-independence.withdrawal.balance')}
            labelFor="withdrawal-balance"
            value={balance}
            onValueChange={setBalance}
            error={errors.balance}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.rate')}
            labelFor="withdrawal-rate"
            value={rate}
            onValueChange={setRate}
            error={errors.rate}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.inflation')}
            labelFor="withdrawal-inflation"
            value={inflation}
            onValueChange={setInflation}
            error={errors.inflation}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.admin-fee')}
            labelFor="withdrawal-admin-fee"
            value={adminFee}
            onValueChange={setAdminFee}
            error={errors.adminFee}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.income-tax')}
            labelFor="withdrawal-income-tax"
            value={incomeTax}
            onValueChange={setIncomeTax}
            error={errors.incomeTax}
          />
          <NumberField
            className="h-8"
            label={t('financial-independence.withdrawal.years')}
            labelFor="withdrawal-years"
            value={years}
            onValueChange={setYears}
            error={errors.years}
          />
        </div>
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div>
            <span className="text-sm text-muted-foreground">
              {t('financial-independence.withdrawal.result')}
            </span>
            <p className="text-2xl font-semibold">
              {figures
                ? formatMoney(
                    figures.monthlyWithdrawal,
                    formattingLocale(),
                    mainCurrency
                  )
                : '—'}
            </p>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span className="text-muted-foreground">
              {t('financial-independence.withdrawal.first-interest')}
            </span>
            <span className="font-medium tabular-nums">
              {figures
                ? formatMoney(
                    figures.firstMonthNetInterest,
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
