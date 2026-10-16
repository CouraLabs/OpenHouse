import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type {
  CreateRecurringTransactionBody,
  Frequency,
  RecurringTransaction,
} from '@workspace/poco'
import {
  createRecurringTransactionSchema,
  frequencies,
  transactionTypes,
} from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
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
  useActiveAccounts,
  useActiveCategories,
  useActiveReceivers,
} from './use-recurring.js'

/**
 * The fields the recurring form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them.
 */
const recurringFormSchema = createRecurringTransactionSchema

type RecurringFormValues = z.infer<typeof recurringFormSchema>

/** The props `RecurringForm` takes. */
interface RecurringFormProps {
  /** The rule being edited, or nothing while creating. */
  rule: RecurringTransaction | null
  /** What a submit should do; the page decides where it saves. */
  onSubmit: (body: CreateRecurringTransactionBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/** The default values of a new rule: nothing chosen, nothing typed. */
const NEW_RULE: RecurringFormValues = {
  receiverId: undefined as unknown as number,
  categoryId: undefined as unknown as number,
  linkedAccountId: undefined as unknown as number,
  amount: '',
  type: 'Expense' as RecurringFormValues['type'],
  frequency: undefined as unknown as Frequency,
  frequencyDay: undefined,
  frequencyMonth: undefined,
}

/**
 * The insert and edit form of the recurring page: a receiver, a category,
 * an account, an amount, and the schedule — whose day and month fields
 * appear only for the frequencies that use them.
 */
export function RecurringForm({
  rule,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: RecurringFormProps) {
  const { t, i18n } = useTranslation()
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues: NEW_RULE,
  })

  // The form holds the rule it edits: switching rows resets the fields.
  useEffect(() => {
    reset(
      rule === null
        ? NEW_RULE
        : {
            receiverId: rule.receiverId,
            categoryId: rule.categoryId,
            linkedAccountId: rule.linkedAccountId,
            amount: rule.amount,
            type: rule.type,
            frequency: rule.frequency,
            frequencyDay: rule.frequencyDay ?? undefined,
            frequencyMonth: rule.frequencyMonth ?? undefined,
          }
    )
  }, [rule, reset])

  const frequency = watch('frequency')
  const type = watch('type')
  const receiverId = watch('receiverId')
  const categoryId = watch('categoryId')
  const accountId = watch('linkedAccountId')
  const amount = watch('amount')
  const frequencyDay = watch('frequencyDay')
  const frequencyMonth = watch('frequencyMonth')

  const receivers = useActiveReceivers()
  const categories = useActiveCategories()
  const accounts = useActiveAccounts()

  // The triggers' labels are rendered explicitly: a prefilled value set
  // while the popup is closed would otherwise fall back to the placeholder.
  const findLabel = <T extends { id: number; name: string }>(
    rows: T[] | undefined,
    id: number | null | undefined
  ) => rows?.find((row) => row.id === id)?.name

  // A Daily rule has no day; a Weekly one reads a weekday (1–7); a Monthly
  // one a day of the month (1–31); a Yearly one a day and a month.
  const dayOptions =
    frequency === 'Weekly'
      ? Array.from({ length: 7 }, (_, index) => index + 1)
      : Array.from({ length: 31 }, (_, index) => index + 1)

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {rule === null ? t('recurring.new') : t('recurring.edit-title')}
      </p>
      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Field data-invalid={errors.receiverId !== undefined}>
          <FieldLabel htmlFor="recurring-receiver">
            {t('recurring.receiver')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={receiverId}
            onValueChange={(value) =>
              setValue('receiverId', value as number, { shouldValidate: true })
            }
          >
            <SelectTrigger id="recurring-receiver">
              <SelectValue>
                {findLabel(receivers.data, receiverId) ??
                  t('recurring.receiver-placeholder')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(receivers.data ?? []).map((receiver) => (
                <SelectItem key={receiver.id} value={receiver.id}>
                  {receiver.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.receiverId !== undefined ? (
            <FieldError>{errors.receiverId.message}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.categoryId !== undefined}>
          <FieldLabel htmlFor="recurring-category">
            {t('recurring.category')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={categoryId}
            onValueChange={(value) =>
              setValue('categoryId', value as number, { shouldValidate: true })
            }
          >
            <SelectTrigger id="recurring-category">
              <SelectValue>
                {findLabel(categories.data, categoryId) ??
                  t('recurring.category-placeholder')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryId !== undefined ? (
            <FieldError>{errors.categoryId.message}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.linkedAccountId !== undefined}>
          <FieldLabel htmlFor="recurring-account">
            {t('recurring.account')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={accountId}
            onValueChange={(value) =>
              setValue('linkedAccountId', value as number, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="recurring-account">
              <SelectValue>
                {findLabel(accounts.data, accountId) ??
                  t('recurring.account-placeholder')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.linkedAccountId !== undefined ? (
            <FieldError>{errors.linkedAccountId.message}</FieldError>
          ) : null}
        </Field>
        <MoneyField
          locale={i18n.language}
          label={t('recurring.amount')}
          labelFor="recurring-amount"
          placeholder={t('recurring.amount-placeholder')}
          value={amount}
          onValueChange={(value) =>
            setValue('amount', value, { shouldValidate: true })
          }
          error={errors.amount}
          required
        />
        <Field data-invalid={errors.type !== undefined}>
          <FieldLabel>{t('recurring.type')}</FieldLabel>
          <RadioGroup
            value={type}
            onValueChange={(value) =>
              setValue('type', value as RecurringFormValues['type'], {
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
                {t(`recurring.type-${value.toLowerCase()}`)}
              </span>
            ))}
          </RadioGroup>
          {errors.type !== undefined ? (
            <FieldError>{errors.type.message}</FieldError>
          ) : null}
        </Field>
        <Field data-invalid={errors.frequency !== undefined}>
          <FieldLabel htmlFor="recurring-frequency">
            {t('recurring.frequency')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={frequency}
            onValueChange={(value) => {
              setValue('frequency', value as Frequency, {
                shouldValidate: true,
              })
              // A new schedule clears the day fields it does not use.
              setValue('frequencyDay', undefined)
              setValue('frequencyMonth', undefined)
            }}
          >
            <SelectTrigger id="recurring-frequency">
              <SelectValue>
                {frequency === undefined
                  ? t('recurring.frequency-placeholder')
                  : t(`recurring.frequency-${frequency.toLowerCase()}`)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`recurring.frequency-${value.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frequency !== undefined ? (
            <FieldError>{errors.frequency.message}</FieldError>
          ) : null}
        </Field>
        {frequency !== undefined && frequency !== 'Daily' ? (
          <Field data-invalid={errors.frequencyDay !== undefined}>
            <FieldLabel htmlFor="recurring-frequency-day">
              {t('recurring.frequency-day')}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </FieldLabel>
            <Select
              value={frequencyDay}
              onValueChange={(value) =>
                setValue('frequencyDay', Number(value), {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="recurring-frequency-day">
                <SelectValue>
                  {frequencyDay === undefined
                    ? t('recurring.frequency-day-placeholder')
                    : frequency === 'Weekly'
                      ? t(`recurring.weekday-${frequencyDay}`)
                      : String(frequencyDay)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {dayOptions.map((day) => (
                  <SelectItem key={day} value={day}>
                    {frequency === 'Weekly'
                      ? t(`recurring.weekday-${day}`)
                      : String(day)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.frequencyDay !== undefined ? (
              <FieldError>{errors.frequencyDay.message}</FieldError>
            ) : null}
          </Field>
        ) : null}
        {frequency === 'Yearly' ? (
          <Field data-invalid={errors.frequencyMonth !== undefined}>
            <FieldLabel htmlFor="recurring-frequency-month">
              {t('recurring.frequency-month')}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </FieldLabel>
            <Select
              value={frequencyMonth}
              onValueChange={(value) =>
                setValue('frequencyMonth', Number(value), {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="recurring-frequency-month">
                <SelectValue>
                  {frequencyMonth === undefined
                    ? t('recurring.frequency-month-placeholder')
                    : String(frequencyMonth)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (month) => (
                    <SelectItem key={month} value={month}>
                      {String(month)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            {errors.frequencyMonth !== undefined ? (
              <FieldError>{errors.frequencyMonth.message}</FieldError>
            ) : null}
          </Field>
        ) : null}
      </div>
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('recurring.cancel')}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('recurring.saving') : t('recurring.save')}
        </Button>
      </div>
    </form>
  )
}
