import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { NumberField } from '@workspace/ui/components/number-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  rateConversionInputSchema,
  type RateConversionResult,
  type RateUnit,
} from '@workspace/dto'

import { fieldErrorsOf, type FieldErrors } from '@/lib/field-errors.js'
import { formatPercent } from '@/lib/finance.js'
import { useTipCalculation } from '@/lib/tip-calculation.js'
import { formattingLocale } from '@/lib/i18n.js'

const UNITS: Array<{ value: RateUnit; labelKey: string }> = [
  { value: 'year', labelKey: 'rate-conversion.converter.unit-year' },
  { value: 'month', labelKey: 'rate-conversion.converter.unit-month' },
  { value: 'day', labelKey: 'rate-conversion.converter.unit-day' },
]

const TARGETS: Array<{ value: RateUnit; labelKey: string }> = [
  { value: 'year', labelKey: 'rate-conversion.converter.year' },
  { value: 'month', labelKey: 'rate-conversion.converter.month' },
  { value: 'day', labelKey: 'rate-conversion.converter.day' },
]

export function RateConverter() {
  const { t } = useTranslation()
  const [unit, setUnit] = useState<RateUnit>('year')
  const [rate, setRate] = useState('10')
  const selectedUnit = UNITS.find((choice) => choice.value === unit)

  const parsed = rateConversionInputSchema.safeParse({ rate, unit })
  const errors: FieldErrors = parsed.success ? {} : fieldErrorsOf(parsed.error)
  const calculation = useTipCalculation<RateConversionResult>(
    'rate-conversion',
    parsed.success ? parsed.data : undefined
  )
  const rates = parsed.success ? calculation.data?.rates : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('rate-conversion.converter.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-3">
          <NumberField
            className="h-8"
            label={t('rate-conversion.converter.rate')}
            labelFor="rate-conversion-rate"
            placeholder={t('rate-conversion.converter.rate-placeholder')}
            value={rate}
            onValueChange={setRate}
            error={errors.rate}
          />
          <Field>
            <FieldLabel htmlFor="rate-conversion-unit">
              {t('rate-conversion.converter.unit')}
            </FieldLabel>
            <Select
              value={unit}
              onValueChange={(value) => setUnit(value as RateUnit)}
              items={UNITS.map((choice) => ({
                value: choice.value,
                label: t(choice.labelKey),
              }))}
            >
              <SelectTrigger
                id="rate-conversion-unit"
                className="w-full"
                size="sm"
              >
                <SelectValue placeholder={t('rate-conversion.converter.unit')}>
                  {selectedUnit === undefined
                    ? undefined
                    : t(selectedUnit.labelKey)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {UNITS.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {t(choice.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {TARGETS.map((target) => {
            const converted = rates?.find((item) => item.unit === target.value)

            return (
              <div
                key={target.labelKey}
                className="flex flex-col gap-0.5 rounded-md border p-3"
              >
                <span className="text-sm text-muted-foreground">
                  {t(target.labelKey)}
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {converted === undefined
                    ? '—'
                    : formatPercent(converted.rate, formattingLocale())}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
