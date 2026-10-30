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

import { formatPercent } from '@/lib/finance.js'
import { formatMoney } from '@/lib/format-money.js'
import { useMainCurrency } from '@/lib/settings.js'
import { formattingLocale } from '@/lib/i18n.js'

export function CdiExample() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const [diRate, setDiRate] = useState('13')
  const [share, setShare] = useState('90')
  const [deposit, setDeposit] = useState('10000.00')
  const [years, setYears] = useState('10')

  const dailyRate = (1 + (Number(diRate) || 0) / 100) ** (1 / 252) - 1
  const dailyNet = dailyRate * ((Number(share) || 0) / 100)
  const effectiveAnnual = (1 + dailyNet) ** 252 - 1
  const count = Math.max(Math.round(Number(years) || 0), 0)
  const saved = (Number(deposit) || 0) * count
  const futureValue =
    effectiveAnnual === 0
      ? saved
      : ((Number(deposit) || 0) * ((1 + effectiveAnnual) ** count - 1)) /
        effectiveAnnual

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('rate-conversion.cdi.title')}
        </CardTitle>
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
          />
          <NumberField
            className="h-8"
            label={t('rate-conversion.cdi.share')}
            labelFor="cdi-share"
            value={share}
            onValueChange={setShare}
          />
          <MoneyField
            locale={formattingLocale()}
            className="h-8"
            label={t('rate-conversion.cdi.deposit')}
            labelFor="cdi-deposit"
            value={deposit}
            onValueChange={setDeposit}
          />
          <NumberField
            className="h-8"
            label={t('rate-conversion.cdi.years')}
            labelFor="cdi-years"
            value={years}
            onValueChange={setYears}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ResultTile
            label={t('rate-conversion.cdi.daily-rate')}
            value={formatPercent(dailyRate, formattingLocale())}
          />
          <ResultTile
            label={t('rate-conversion.cdi.daily-net')}
            value={formatPercent(dailyNet, formattingLocale())}
          />
          <ResultTile
            label={t('rate-conversion.cdi.effective-annual')}
            value={formatPercent(effectiveAnnual, formattingLocale())}
          />
        </div>
        <div className="rounded-md border p-3">
          <span className="text-sm text-muted-foreground">
            {t('rate-conversion.cdi.future-value', { count })}
          </span>
          <p className="text-2xl font-semibold">
            {formatMoney(String(futureValue), formattingLocale(), mainCurrency)}
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
