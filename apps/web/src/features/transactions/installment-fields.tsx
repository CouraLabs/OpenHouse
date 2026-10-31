import { useTranslation } from 'react-i18next'
import type { InstallmentAmountMode, InstallmentsBody } from '@workspace/dto'
import { installmentAmountModes } from '@workspace/dto'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import { NumberField } from '@workspace/ui/components/number-field'
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group'
import { formattingLocale } from '@/lib/i18n.js'

export function InstallmentFields({
  value,
  onChange,
  cashPrice,
  onCashPriceChange,
  error,
}: {
  value: InstallmentsBody
  onChange: (value: InstallmentsBody) => void
  cashPrice: string
  onCashPriceChange: (value: string) => void
  error?: { message?: string }
}) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3 rounded-[0.875rem] bg-surface-2 p-4">
      <NumberField
        label={t('transactions.installments')}
        labelFor="transaction-installments"
        inputMode="numeric"
        value={Number.isNaN(value.count) ? '' : String(value.count)}
        onValueChange={(raw) =>
          onChange({ ...value, count: raw === '' ? Number.NaN : Number(raw) })
        }
        error={error}
      />
      {value.count > 1 ? (
        <Field>
          <FieldLabel>{t('transactions.installment-amount-mode')}</FieldLabel>
          <RadioGroup
            value={value.amountMode}
            onValueChange={(mode) =>
              onChange({ ...value, amountMode: mode as InstallmentAmountMode })
            }
            className="grid-cols-2"
          >
            {installmentAmountModes.map((mode) => (
              <span
                key={mode}
                className="flex items-center gap-2 rounded-lg border bg-surface-2 p-3 text-sm has-[[data-checked]]:border-primary/50 has-[[data-checked]]:bg-primary-soft"
              >
                <RadioGroupItem value={mode} />
                {t(`transactions.installment-mode-${mode}`)}
              </span>
            ))}
          </RadioGroup>
        </Field>
      ) : null}
      {value.count > 1 && value.amountMode === 'perInstallment' ? (
        <MoneyField
          locale={formattingLocale()}
          label={t('transactions.cash-price')}
          labelFor="transaction-cash-price"
          placeholder={t('transactions.amount-placeholder')}
          value={cashPrice}
          onValueChange={onCashPriceChange}
        />
      ) : null}
    </div>
  )
}
