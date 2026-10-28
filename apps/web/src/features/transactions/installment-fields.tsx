import { useTranslation } from 'react-i18next'
import type { InstallmentAmountMode, InstallmentsBody } from '@workspace/poco'
import { installmentAmountModes } from '@workspace/poco'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import { NumberField } from '@workspace/ui/components/number-field'
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * How a card purchase splits: how many installments (1–48; 1 is a single
 * charge), whether the amount typed is the total or each installment, and
 * — for an interest-bearing plan — the cash price it compares against. The
 * cash price is the form's alone; nothing stores it.
 */
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
    <div className="flex flex-col gap-3 rounded-lg border p-3">
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
                className="flex items-center gap-2 rounded-lg border p-2 text-sm has-[[data-checked]]:border-primary"
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
