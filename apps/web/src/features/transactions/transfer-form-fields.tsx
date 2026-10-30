import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { AccountRef, Currency } from '@workspace/poco'
import { transferSchema } from '@workspace/poco'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { MoneyField } from '@workspace/ui/components/money-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TextField } from '@workspace/ui/components/text-field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { RefPick } from '@workspace/ui/components/ref-pick'
import { PaymentBillPick } from './payment-bill-pick.js'
import { useActiveCategories } from './use-transactions.js'
import { formattingLocale } from '@/lib/i18n.js'

const transferFormSchema = transferSchema

export type TransferFormValues = z.infer<typeof transferFormSchema>

export interface TransferFormFieldsProps {
  accounts: AccountRef[]
  defaultDt: string
  onSubmit: (body: TransferFormValues) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

export function TransferFormFields({
  accounts,
  defaultDt,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: TransferFormFieldsProps) {
  const { t } = useTranslation()
  const {
    handleSubmit,
    watch,
    setValue,
    setError,
    register,
    formState: { errors },
  } = useForm<TransferFormValues, unknown, TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: newValues(defaultDt),
  })

  const fromId = watch('fromAccountId')
  const toId = watch('toAccountId')
  const amount = watch('amount')
  const transactionDt = watch('transactionDt')

  const categories = useActiveCategories()
  const from = accounts.find((account) => account.id === fromId)
  const to = accounts.find((account) => account.id === toId)
  const paysCard = to?.type === 'Credit Card'
  const chosenCurrency: Currency | undefined = from?.currency ?? to?.currency
  const destinationOptions = accounts.filter(
    (account) =>
      account.id !== fromId &&
      (chosenCurrency === undefined || account.currency === chosenCurrency)
  )
  const sourceOptions = accounts.filter(
    (account) =>
      account.id !== toId &&
      (chosenCurrency === undefined || account.currency === chosenCurrency)
  )

  return (
    <FormSheet
      title={t('transactions.transfer-title')}
      submitLabel={isSaving ? t('transactions.saving') : t('transactions.save')}
      cancelLabel={t('transactions.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) => {
        if (values.categoryId === undefined && !paysCard) {
          setError('categoryId', { message: t('transactions.pick-category') })

          return
        }

        onSubmit(
          paysCard ? values : { ...values, paymentStatementId: undefined }
        )
      })}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RefPick
          id="transfer-from"
          label={t('transactions.transfer-from')}
          placeholder={t('transactions.transfer-from-placeholder')}
          value={fromId}
          options={sourceOptions}
          error={errors.fromAccountId?.message}
          onChange={(value) =>
            setValue('fromAccountId', value, { shouldValidate: true })
          }
        />
        <RefPick
          id="transfer-to"
          label={t('transactions.transfer-to')}
          placeholder={t('transactions.transfer-to-placeholder')}
          value={toId}
          options={destinationOptions}
          error={errors.toAccountId?.message}
          onChange={(value) => {
            setValue('toAccountId', value, { shouldValidate: true })
            setValue('paymentStatementId', undefined)
          }}
        />
      </div>
      {paysCard && to !== undefined ? (
        <PaymentBillPick
          cardId={to.id}
          value={watch('paymentStatementId')}
          onChange={(value) => setValue('paymentStatementId', value)}
        />
      ) : null}
      {from !== undefined &&
      to !== undefined &&
      from.currency !== to.currency ? (
        <p className="text-sm text-destructive">
          {t('transactions.transfer-currency-mismatch')}
        </p>
      ) : null}
      <MoneyField
        locale={formattingLocale()}
        label={t('transactions.transfer-amount')}
        labelFor="transfer-amount"
        placeholder={t('transactions.amount-placeholder')}
        value={amount}
        onValueChange={(value) =>
          setValue('amount', value, { shouldValidate: true })
        }
        error={errors.amount}
        required
      />
      <Field data-invalid={errors.transactionDt !== undefined}>
        <FieldLabel htmlFor="transfer-dt">
          {t('transactions.transfer-date')}
          <RequiredMark />
        </FieldLabel>
        <DatePicker
          id="transfer-dt"
          locale={formattingLocale()}
          value={parseDateOnly(transactionDt)}
          onChange={(date) =>
            setValue('transactionDt', formatDateOnly(date), {
              shouldValidate: true,
            })
          }
          labels={{
            placeholder: t('transactions.date-placeholder'),
            today: t('transactions.date-placeholder'),
          }}
        />
        {errors.transactionDt !== undefined ? (
          <FieldError>{errors.transactionDt.message}</FieldError>
        ) : null}
      </Field>
      <Field data-invalid={errors.categoryId !== undefined}>
        <FieldLabel htmlFor="transfer-category">
          {t('transactions.transfer-category')}
          {paysCard ? null : <RequiredMark />}
        </FieldLabel>
        <Select
          value={watch('categoryId')}
          onValueChange={(rawValue) =>
            setValue('categoryId', Number(rawValue as unknown as string), {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="transfer-category">
            <SelectValue>
              {(categories.data ?? []).find(
                (category) => category.id === watch('categoryId')
              )?.name ??
                (paysCard
                  ? t('transactions.card-payment-category')
                  : t('transactions.transfer-category-placeholder'))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(categories.data ?? []).map((category) => (
              <SelectItem
                key={category.id}
                value={category.id as unknown as string}
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId !== undefined ? (
          <FieldError>{errors.categoryId.message}</FieldError>
        ) : null}
      </Field>
      <TextField
        type="text"
        label={t('transactions.transfer-note')}
        labelFor="transfer-note"
        error={errors.note}
        {...register('note')}
      />
    </FormSheet>
  )
}

function newValues(defaultDt: string): TransferFormValues {
  return {
    fromAccountId: undefined as unknown as number,
    toAccountId: undefined as unknown as number,
    categoryId: undefined,
    amount: '',
    transactionDt: defaultDt,
    note: undefined,
  }
}
