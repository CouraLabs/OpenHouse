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

import { convertRate, formatPercent, type RateUnit } from '@/lib/finance.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The period choices the original-rate select offers. */
const UNITS: Array<{ value: RateUnit; labelKey: string }> = [
  { value: 'year', labelKey: 'rate-conversion.converter.unit-year' },
  { value: 'month', labelKey: 'rate-conversion.converter.unit-month' },
  { value: 'day', labelKey: 'rate-conversion.converter.unit-day' },
]

/** The periods every rate converts to, always in this display order. */
const TARGETS: Array<{ value: RateUnit; labelKey: string }> = [
  { value: 'year', labelKey: 'rate-conversion.converter.year' },
  { value: 'month', labelKey: 'rate-conversion.converter.month' },
  { value: 'day', labelKey: 'rate-conversion.converter.day' },
]

/**
 * One rate in, all three periods out: the card holds the original period,
 * the rate, and the converted figures — compounding, never dividing.
 */
export function RateConverter() {
  const { t } = useTranslation()
  const [unit, setUnit] = useState<RateUnit>('year')
  const [rate, setRate] = useState('10')
  // The trigger's label is rendered here, not derived by base-ui from
  // `items`: a prefilled value set while the popup was closed would
  // otherwise fall back to the placeholder.
  const selectedUnit = UNITS.find((choice) => choice.value === unit)

  const converted = TARGETS.map((target) => ({
    ...target,
    value: convertRate((Number(rate) || 0) / 100, unit, target.value),
  }))

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
          {converted.map((row) => (
            <div
              key={row.labelKey}
              className="flex flex-col gap-0.5 rounded-md border p-3"
            >
              <span className="text-sm text-muted-foreground">
                {t(row.labelKey)}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatPercent(row.value, formattingLocale())}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
