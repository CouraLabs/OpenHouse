import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { AccountRef, Currency } from '@workspace/poco'
import { transferSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DialogFooter } from '@workspace/ui/components/dialog'
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
import { AccountPick } from './account-pick.js'
import { useActiveCategories } from './use-transactions.js'

/**
 * The fields the transfer form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const transferFormSchema = transferSchema

export type TransferFormValues = z.infer<typeof transferFormSchema>

/** The props `TransferFormFields` takes. */
export interface TransferFormFieldsProps {
  /** The tenant's ACTIVE accounts, with the currency each holds. */
  accounts: AccountRef[]
  /** The day the transfer starts on — the month the grid shows. */
  defaultDt: string
  /** What a submit should do; the page decides where it saves. */
  onSubmit: (body: TransferFormValues) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/**
 * The fields of the transfer dialog. Rendered inside the dialog's content,
 * which unmounts on close, so every opening starts from fresh values.
 */
export function TransferFormFields({
  accounts,
  defaultDt,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: TransferFormFieldsProps) {
  const { t, i18n } = useTranslation()
  const {
    handleSubmit,
    watch,
    setValue,
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
  const chosenCurrency: Currency | undefined = from?.currency ?? to?.currency
  // The destination excludes the source; both sides share the currency.
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
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <AccountPick
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
        <AccountPick
          id="transfer-to"
          label={t('transactions.transfer-to')}
          placeholder={t('transactions.transfer-to-placeholder')}
          value={toId}
          options={destinationOptions}
          error={errors.toAccountId?.message}
          onChange={(value) =>
            setValue('toAccountId', value, { shouldValidate: true })
          }
        />
      </div>
      {from !== undefined &&
      to !== undefined &&
      from.currency !== to.currency ? (
        <p className="text-sm text-destructive">
          {t('transactions.transfer-currency-mismatch')}
        </p>
      ) : null}
      <MoneyField
        locale={i18n.language}
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
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </FieldLabel>
        <DatePicker
          id="transfer-dt"
          locale={i18n.language}
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
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
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
              )?.name ?? t('transactions.transfer-category-placeholder')}
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
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('transactions.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('transactions.saving') : t('transactions.save')}
        </Button>
      </DialogFooter>
    </form>
  )
}

/** The values a new transfer starts with: the month the grid shows. */
function newValues(defaultDt: string): TransferFormValues {
  return {
    fromAccountId: undefined as unknown as number,
    toAccountId: undefined as unknown as number,
    categoryId: undefined as unknown as number,
    amount: '',
    transactionDt: defaultDt,
    note: undefined,
  }
}
