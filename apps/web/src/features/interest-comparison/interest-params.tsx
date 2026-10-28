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
import { formattingLocale } from '@/lib/i18n.js'

/** The period the projection counts in: whole years or whole months. */
export type InterestUnit = 'year' | 'month'

/** The unit choices the period select offers. */
const UNITS: Array<{ value: InterestUnit; labelKey: string }> = [
  { value: 'year', labelKey: 'interest-comparison.params.unit-year' },
  { value: 'month', labelKey: 'interest-comparison.params.unit-month' },
]

/** The props `InterestParams` takes: every value the page owns. */
interface InterestParamsProps {
  presentValue: string
  rate: string
  periods: string
  unit: InterestUnit
  onPresentValueChange: (value: string) => void
  onRateChange: (value: string) => void
  onPeriodsChange: (value: string) => void
  onUnitChange: (unit: InterestUnit) => void
}

/**
 * The projection's inputs, one row: the present value, the net annual
 * rate, the span, and the unit that span counts in. The rate is always
 * quoted a year — the unit only decides what one period of the schedule
 * means, exactly as the sheet's `ano`/`mês` switch did.
 */
export function InterestParams({
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
  // The trigger's label is rendered here, not derived by base-ui from
  // `items`: a prefilled value set while the popup was closed would
  // otherwise fall back to the placeholder.
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
          placeholder={t('interest-comparison.params.amount-placeholder')}
          value={presentValue}
          onValueChange={onPresentValueChange}
        />
        <NumberField
          className="h-8"
          label={t('interest-comparison.params.rate')}
          labelFor="interest-rate"
          placeholder={t('interest-comparison.params.rate-placeholder')}
          value={rate}
          onValueChange={onRateChange}
        />
        <NumberField
          className="h-8"
          label={t('interest-comparison.params.periods')}
          labelFor="interest-periods"
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
