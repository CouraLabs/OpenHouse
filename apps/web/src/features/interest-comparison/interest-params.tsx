import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import { NumberField } from '@workspace/ui/components/number-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import type { InterestUnit } from '@workspace/dto'

import type { FieldErrors } from '@/lib/field-errors.js'
import { formattingLocale } from '@/lib/i18n.js'


const UNITS: Array<{ value: InterestUnit; labelKey: string }> = [
  { value: 'year', labelKey: 'interest-comparison.params.unit-year' },
  { value: 'month', labelKey: 'interest-comparison.params.unit-month' },
]

interface InterestParamsProps {
  errors: FieldErrors
  presentValue: string
  rate: string
  periods: string
  unit: InterestUnit
  onPresentValueChange: (value: string) => void
  onRateChange: (value: string) => void
  onPeriodsChange: (value: string) => void
  onUnitChange: (unit: InterestUnit) => void
}

export function InterestParams({
  errors,
  presentValue,
  rate,
  periods,
  unit,
  onPresentValueChange,
  onRateChange,
  onPeriodsChange,
  onUnitChange,
}: InterestParamsProps) {
  const { t } = useTranslation()
  const selectedUnit = UNITS.find((choice) => choice.value === unit)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('interest-comparison.params.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">
        <MoneyField
          locale={formattingLocale()}
          className="h-8"
          label={t('interest-comparison.params.present-value')}
          labelFor="interest-present-value"
          error={errors.presentValue}
          placeholder={t('interest-comparison.params.amount-placeholder')}
          value={presentValue}
          onValueChange={onPresentValueChange}
        />
        <NumberField
          className="h-8"
          label={t('interest-comparison.params.rate')}
          labelFor="interest-rate"
          error={errors.rate}
          placeholder={t('interest-comparison.params.rate-placeholder')}
          value={rate}
          onValueChange={onRateChange}
        />
        <NumberField
          className="h-8"
          label={t('interest-comparison.params.periods')}
          labelFor="interest-periods"
          error={errors.periods}
          placeholder={t('interest-comparison.params.periods-placeholder')}
          value={periods}
          onValueChange={onPeriodsChange}
        />
        <Field>
          <FieldLabel htmlFor="interest-unit">
            {t('interest-comparison.params.unit')}
          </FieldLabel>
          <Select
            value={unit}
            onValueChange={(value) => onUnitChange(value as InterestUnit)}
            items={UNITS.map((choice) => ({
              value: choice.value,
              label: t(choice.labelKey),
            }))}
          >
            <SelectTrigger id="interest-unit" className="w-full" size="sm">
              <SelectValue placeholder={t('interest-comparison.params.unit')}>
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
      </CardContent>
    </Card>
  )
}
