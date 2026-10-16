import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type {
  CreateTransactionBody,
  ReceiverRef,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@workspace/poco'
import {
  createTransactionSchema,
  transactionStatuses,
  transactionTypes,
} from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Textarea } from '@workspace/ui/components/textarea'
import { TextField } from '@workspace/ui/components/text-field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { inferCategory } from './infer-category.js'
import {
  useActiveAccounts,
  useActiveCategories,
  useActiveReceivers,
} from './use-transactions.js'

/**
 * The fields the transaction form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const transactionFormSchema = createTransactionSchema

/** The form's values, before the schema's defaults apply. */
type TransactionFormInput = z.input<typeof transactionFormSchema>

/** The props `TransactionForm` takes. */
interface TransactionFormProps {
  /** Whether the sheet is open. */
  open: boolean
  /** The transaction being edited, or nothing while creating. */
  transaction: Transaction | null
  /** The day a new transaction starts on — today, whatever month the grid
   * shows. */
  defaultDt: string
  /** What a submit should do; the page decides where it saves. */
  onSubmit: (body: CreateTransactionBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/**
 * The insert and edit form of the transactions page, in a side sheet: the
 * cards and the grid would be pushed far down by an inline form on this
 * page, and the sheet keeps the month context visible. The account's
 * balance moves with the save — the form never edits `balanceOnDt`.
 */
export function TransactionForm({
  open,
  transaction,
  defaultDt,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: TransactionFormProps) {
  const { t, i18n } = useTranslation()
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<TransactionFormInput, unknown, CreateTransactionBody>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: newValues(defaultDt),
  })

  // The form holds the transaction it edits: opening it resets the fields.
  useEffect(() => {
    if (!open) {
      return
    }

    reset(
      transaction === null
        ? newValues(defaultDt)
        : {
            name: transaction.name,
            note: transaction.note ?? undefined,
            invoice: transaction.invoice ?? '',
            amount: transaction.amount,
            transactionDt: transaction.transactionDt,
            linkedAccountId: transaction.linkedAccountId,
            categoryId: transaction.categoryId,
            receiverId: transaction.receiverId ?? undefined,
            type: transaction.type,
            status: transaction.status,
            statusNote: transaction.statusNote ?? undefined,
          }
    )
  }, [open, transaction, defaultDt, reset])

  const type = watch('type')
  const status = watch('status')
  const amount = watch('amount')
  const transactionDt = watch('transactionDt')
  const accountId = watch('linkedAccountId')
  const categoryId = watch('categoryId')
  const receiverId = watch('receiverId')
  const name = watch('name')

  const accounts = useActiveAccounts()
  const categories = useActiveCategories()
  const receivers = useActiveReceivers()

  // A new transaction starts in the tenant's default account, once the
  // picker's accounts arrive and the user has not chosen one.
  useEffect(() => {
    if (!open || transaction !== null || accountId !== undefined) {
      return
    }

    const preferred = (accounts.data ?? []).find((account) => account.isDefault)

    if (preferred !== undefined) {
      setValue('linkedAccountId', preferred.id, { shouldValidate: true })
    }
  }, [open, transaction, accountId, accounts.data, setValue])

  // A new transaction's category is inferred from the description: the
  // best fuzzy match against the tenant's categories, applied only while
  // the user has not picked one.
  useEffect(() => {
    if (!open || transaction !== null || categoryId !== undefined) {
      return
    }

    const inferred = inferCategory(name, categories.data ?? [])

    if (inferred !== undefined) {
      setValue('categoryId', inferred.id, { shouldValidate: true })
    }
  }, [open, transaction, name, categoryId, categories.data, setValue])

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onCancel()
        }
      }}
    >
      <SheetContent
        side="right"
        className="flex flex-col gap-4 overflow-y-auto p-6 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>
            {transaction === null
              ? t('transactions.new-title')
              : t('transactions.edit-title')}
          </SheetTitle>
        </SheetHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit(values))}
          className="flex flex-col gap-4"
          noValidate
        >
          <TextField
            type="text"
            label={t('transactions.name')}
            labelFor="transaction-name"
            placeholder={t('transactions.name-placeholder')}
            required
            error={errors.name}
            {...register('name')}
          />
          <Field data-invalid={errors.type !== undefined}>
            <FieldLabel>{t('transactions.type')}</FieldLabel>
            <RadioGroup
              value={type}
              onValueChange={(value) =>
                setValue('type', value as TransactionType, {
                  shouldValidate: true,
                })
              }
              className="grid-cols-2"
            >
              {transactionTypes.map((value) => (
                <span
                  key={value}
                  className="flex items-center gap-2 rounded-lg border p-2 text-sm has-[[data-checked]]:border-primary"
                >
                  <RadioGroupItem value={value} />
                  {t(`transactions.type-${value.toLowerCase()}`)}
                </span>
              ))}
            </RadioGroup>
            {errors.type !== undefined ? (
              <FieldError>{errors.type.message}</FieldError>
            ) : null}
          </Field>
          <MoneyField
            locale={i18n.language}
            label={t('transactions.amount')}
            labelFor="transaction-amount"
            placeholder={t('transactions.amount-placeholder')}
            value={amount}
            onValueChange={(value) =>
              setValue('amount', value, { shouldValidate: true })
            }
            error={errors.amount}
            required
          />
          <Field data-invalid={errors.transactionDt !== undefined}>
            <FieldLabel htmlFor="transaction-dt">
              {t('transactions.date')}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </FieldLabel>
            <DatePicker
              id="transaction-dt"
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
          <StringPick
            id="transaction-account"
            label={t('transactions.account')}
            required
            value={accountId === undefined ? undefined : String(accountId)}
            placeholder={t('transactions.filter-account-placeholder')}
            onChange={(value) =>
              setValue(
                'linkedAccountId',
                value === undefined
                  ? (undefined as unknown as number)
                  : Number(value),
                { shouldValidate: true }
              )
            }
            error={errors.linkedAccountId?.message}
            options={(accounts.data ?? []).map((account) => ({
              value: String(account.id),
              label: account.name,
            }))}
          />
          <StringPick
            id="transaction-category"
            label={t('transactions.category')}
            required
            value={categoryId === undefined ? undefined : String(categoryId)}
            placeholder={t('transactions.filter-category-placeholder')}
            onChange={(value) =>
              setValue(
                'categoryId',
                value === undefined
                  ? (undefined as unknown as number)
                  : Number(value),
                { shouldValidate: true }
              )
            }
            error={errors.categoryId?.message}
            options={(categories.data ?? []).map((category) => ({
              value: String(category.id),
              label: category.name,
            }))}
          />
          <StringPick
            id="transaction-receiver"
            label={t('transactions.receiver')}
            value={receiverId == null ? undefined : String(receiverId)}
            placeholder={t('transactions.receiver-placeholder')}
            onChange={(value) =>
              setValue(
                'receiverId',
                value === undefined ? undefined : Number(value)
              )
            }
            options={[
              {
                value: '',
                label: t('transactions.receiver-placeholder'),
              },
              ...(receivers.data ?? []).map((receiver: ReceiverRef) => ({
                value: String(receiver.id),
                label: receiver.name,
              })),
            ]}
          />
          <TextField
            type="text"
            label={t('transactions.invoice')}
            labelFor="transaction-invoice"
            placeholder={t('transactions.invoice-placeholder')}
            error={errors.invoice}
            {...register('invoice', {
              // An empty field is no invoice: the wire carries nothing, not ''.
              setValueAs: (value) => (value === '' ? undefined : value),
            })}
          />
          <Field data-invalid={errors.note !== undefined}>
            <FieldLabel htmlFor="transaction-note">
              {t('transactions.note')}
            </FieldLabel>
            <Textarea
              id="transaction-note"
              placeholder={t('transactions.note-placeholder')}
              {...register('note')}
            />
            {errors.note !== undefined ? (
              <FieldError>{errors.note.message}</FieldError>
            ) : null}
          </Field>
          <StringPick
            id="transaction-status"
            label={t('transactions.status')}
            value={status}
            placeholder={t('transactions.status-placeholder')}
            onChange={(value) =>
              setValue('status', (value ?? 'Verify') as TransactionStatus, {
                shouldValidate: true,
              })
            }
            options={transactionStatuses.map((value) => ({
              value,
              label: t(`transactions.status-${value.toLowerCase()}`),
            }))}
          />
          {status !== undefined && status !== 'Verify' ? (
            <TextField
              type="text"
              label={t('transactions.status-note')}
              labelFor="transaction-status-note"
              placeholder={t('transactions.status-note-placeholder')}
              error={errors.statusNote}
              {...register('statusNote')}
            />
          ) : null}
          {error !== undefined ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('transactions.cancel')}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('transactions.saving') : t('transactions.save')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** The values a new transaction starts with: today's day, the review
 * already checked, and nothing else picked for the user yet. */
function newValues(defaultDt: string): TransactionFormInput {
  return {
    name: '',
    note: undefined,
    invoice: '',
    amount: '',
    transactionDt: defaultDt,
    linkedAccountId: undefined as unknown as number,
    categoryId: undefined as unknown as number,
    receiverId: undefined,
    type: 'Expense',
    status: 'Checked' as TransactionStatus,
    statusNote: undefined,
  }
}

/**
 * One select field of the form, working in the string domain the Select's
 * generic admits: label, trigger with an explicit label (a prefilled value
 * set while the popup is closed would otherwise fall back to the
 * placeholder), options. The caller converts to and from numbers.
 */
function StringPick({
  id,
  label,
  required = false,
  value,
  placeholder,
  onChange,
  options,
  error,
}: {
  id: string
  label: string
  required?: boolean
  value: string | undefined
  placeholder: string
  /** Answers with nothing when the empty option — "None" — was picked. */
  onChange: (value: string | undefined) => void
  options: Array<{ value: string; label: string }>
  error?: string
}) {
  const selected = options.find((option) => option.value === value)

  return (
    <Field data-invalid={error !== undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(rawValue) => {
          const chosen = rawValue as unknown as string

          onChange(chosen === '' ? undefined : chosen)
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue>
            {selected === undefined ? placeholder : selected.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.label} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error !== undefined ? <FieldError>{error}</FieldError> : null}
    </Field>
  )
}
