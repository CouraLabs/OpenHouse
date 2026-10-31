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
import { cdiInputSchema, type CdiResult } from '@workspace/dto'

import { fieldErrorsOf, type FieldErrors } from '@/lib/field-errors.js'
import { formatPercent } from '@/lib/finance.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'
import { useTipCalculation } from '@/lib/tip-calculation.js'
import { formattingLocale } from '@/lib/i18n.js'

export function CdiExample() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const [diRate, setDiRate] = useState('13')
  const [share, setShare] = useState('90')
  const [deposit, setDeposit] = useState('10000.00')
  const [years, setYears] = useState('10')

  const parsed = cdiInputSchema.safeParse({ diRate, share, deposit, years })
  const errors: FieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error)
  const calculation = useTipCalculation<CdiResult>(
    'cdi',
    parsed.success ? parsed.data : undefined
  )
  const figures = parsed.success ? calculation.data : undefined
  const count = parsed.success ? Number(parsed.data.years) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('rate-conversion.cdi.title')}</CardTitle>
        <CardDescription>
          {t('rate-conversion.cdi.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">
          <NumberField
            className="h-8"
            label={t('rate-conversion.cdi.di-rate')}
            labelFor="cdi-di-rate"
            value={diRate}
            onValueChange={setDiRate}
            error={errors.diRate}
          />
          <NumberField
            className="h-8"
            label={t('rate-conversion.cdi.share')}
            labelFor="cdi-share"
            value={share}
            onValueChange={setShare}
            error={errors.share}
          />
          <MoneyField
            locale={formattingLocale()}
            className="h-8"
            label={t('rate-conversion.cdi.deposit')}
            labelFor="cdi-deposit"
            value={deposit}
            onValueChange={setDeposit}
            error={errors.deposit}
          />
          <NumberField
            className="h-8"
            label={t('rate-conversion.cdi.years')}
            labelFor="cdi-years"
            value={years}
            onValueChange={setYears}
            error={errors.years}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ResultTile
            label={t('rate-conversion.cdi.daily-rate')}
            value={
              figures === undefined
                ? '—'
                : formatPercent(figures.dailyDiRate, formattingLocale())
            }
          />
          <ResultTile
            label={t('rate-conversion.cdi.daily-net')}
            value={
              figures === undefined
                ? '—'
                : formatPercent(figures.dailyNetRate, formattingLocale())
            }
          />
          <ResultTile
            label={t('rate-conversion.cdi.effective-annual')}
            value={
              figures === undefined
                ? '—'
                : formatPercent(figures.effectiveAnnualRate, formattingLocale())
            }
          />
        </div>
        <div className="rounded-md border p-3">
          <span className="text-sm text-muted-foreground">
            {t('rate-conversion.cdi.future-value', { count })}
          </span>
          <p className="text-2xl font-semibold">
            {figures === undefined
              ? '—'
              : formatMoney(
                  figures.futureValue,
                  formattingLocale(),
                  mainCurrency
                )}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}
