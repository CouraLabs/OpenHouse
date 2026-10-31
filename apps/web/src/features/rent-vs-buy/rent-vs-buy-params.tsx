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

import type { AmortizationSystem } from '@workspace/dto'

import type { FieldErrors } from '@/lib/field-errors.js'
import { formattingLocale } from '@/lib/i18n.js'

const SYSTEMS: Array<{ value: AmortizationSystem; labelKey: string }> = [
  { value: 'SAC', labelKey: 'rent-vs-buy.params.system-sac' },
  { value: 'PRICE', labelKey: 'rent-vs-buy.params.system-price' },
]

interface RentVsBuyParamsProps {
  errors: FieldErrors
  propertyValue: string
  downPayment: string
  mortgageRate: string
  appreciation: string
  term: string
  system: AmortizationSystem
  rent: string
  annualReturn: string
  rentIncrease: string
  onPropertyValueChange: (value: string) => void
  onDownPaymentChange: (value: string) => void
  onMortgageRateChange: (value: string) => void
  onAppreciationChange: (value: string) => void
  onTermChange: (value: string) => void
  onSystemChange: (system: AmortizationSystem) => void
  onRentChange: (value: string) => void
  onAnnualReturnChange: (value: string) => void
  onRentIncreaseChange: (value: string) => void
}

export function RentVsBuyParams({
  errors,
  propertyValue,
  downPayment,
  mortgageRate,
  appreciation,
  term,
  system,
  rent,
  annualReturn,
  rentIncrease,
  onPropertyValueChange,
  onDownPaymentChange,
  onMortgageRateChange,
  onAppreciationChange,
  onTermChange,
  onSystemChange,
  onRentChange,
  onAnnualReturnChange,
  onRentIncreaseChange,
}: RentVsBuyParamsProps) {
  const { t } = useTranslation()
  const selectedSystem = SYSTEMS.find((choice) => choice.value === system)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t('rent-vs-buy.params.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 items-start gap-3 md:grid-cols-3 lg:grid-cols-5">
        <MoneyField
          locale={formattingLocale()}
          className="h-8"
          label={t('rent-vs-buy.params.property-value')}
          labelFor="rent-vs-buy-property"
          error={errors.propertyValue}
          value={propertyValue}
          onValueChange={onPropertyValueChange}
        />
        <MoneyField
          locale={formattingLocale()}
          className="h-8"
          label={t('rent-vs-buy.params.down-payment')}
          labelFor="rent-vs-buy-down"
          error={errors.downPayment}
          value={downPayment}
          onValueChange={onDownPaymentChange}
        />
        <NumberField
          className="h-8"
          label={t('rent-vs-buy.params.mortgage-rate')}
          labelFor="rent-vs-buy-mortgage-rate"
          error={errors.mortgageRate}
          value={mortgageRate}
          onValueChange={onMortgageRateChange}
        />
        <NumberField
          className="h-8"
          label={t('rent-vs-buy.params.appreciation')}
          labelFor="rent-vs-buy-appreciation"
          error={errors.propertyAppreciation}
          value={appreciation}
          onValueChange={onAppreciationChange}
        />
        <NumberField
          className="h-8"
          label={t('rent-vs-buy.params.term')}
          labelFor="rent-vs-buy-term"
          error={errors.termMonths}
          value={term}
          onValueChange={onTermChange}
        />
        <Field>
          <FieldLabel htmlFor="rent-vs-buy-system">
            {t('rent-vs-buy.params.system')}
          </FieldLabel>
          <Select
            value={system}
            onValueChange={(value) =>
              onSystemChange(value as AmortizationSystem)
            }
            items={SYSTEMS.map((choice) => ({
              value: choice.value,
              label: t(choice.labelKey),
            }))}
          >
            <SelectTrigger id="rent-vs-buy-system" className="w-full" size="sm">
              <SelectValue placeholder={t('rent-vs-buy.params.system')}>
                {selectedSystem === undefined
                  ? undefined
                  : t(selectedSystem.labelKey)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SYSTEMS.map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {t(choice.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <MoneyField
          locale={formattingLocale()}
          className="h-8"
          label={t('rent-vs-buy.params.rent')}
          labelFor="rent-vs-buy-rent"
          error={errors.monthlyRent}
          value={rent}
          onValueChange={onRentChange}
        />
        <NumberField
          className="h-8"
          label={t('rent-vs-buy.params.return')}
          labelFor="rent-vs-buy-return"
          error={errors.investmentReturn}
          value={annualReturn}
          onValueChange={onAnnualReturnChange}
        />
        <NumberField
          className="h-8"
          label={t('rent-vs-buy.params.rent-increase')}
          labelFor="rent-vs-buy-rent-increase"
          error={errors.rentIncrease}
          value={rentIncrease}
          onValueChange={onRentIncreaseChange}
        />
      </CardContent>
    </Card>
  )
}
