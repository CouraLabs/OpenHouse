import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
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

import { SplitSection } from '@/components/split-section.js'
import { useMainCurrency } from '@/lib/settings.js'
import {
  useActiveAccounts,
  useActiveCategories,
  useActiveReceivers,
} from './use-recurring.js'
import { formattingLocale } from '@/lib/i18n.js'

const recurringFormSchema = createRecurringTransactionSchema

type RecurringFormValues = z.infer<typeof recurringFormSchema>

interface RecurringFormProps {
  rule: RecurringTransaction | null
  onSubmit: (body: CreateRecurringTransactionBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

const NEW_RULE: RecurringFormValues = {
  receiverId: undefined as unknown as number,
  categoryId: undefined as unknown as number,
  linkedAccountId: undefined as unknown as number,
  amount: '',
  type: 'Expense' as RecurringFormValues['type'],
  frequency: undefined as unknown as Frequency,
  frequencyDay: undefined,
  frequencyMonth: undefined,
  defaultSplit: null,
}

export function RecurringForm({
  rule,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: RecurringFormProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringFormSchema),
    defaultValues:
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
            paidByUserId: rule.paidByUserId,
            defaultSplit: rule.defaultSplit,
          },
  })

  const frequency = watch('frequency')
  const type = watch('type')
  const receiverId = watch('receiverId')
  const categoryId = watch('categoryId')
  const accountId = watch('linkedAccountId')
  const amount = watch('amount')
  const frequencyDay = watch('frequencyDay')
  const frequencyMonth = watch('frequencyMonth')
  const defaultSplit = watch('defaultSplit') ?? null
  const paidByUserId = watch('paidByUserId') ?? null

  const receivers = useActiveReceivers()
  const categories = useActiveCategories()
  const accounts = useActiveAccounts()

  const ruleCurrency =
    rule === null
      ? undefined
      : accounts.data?.find((account) => account.id === rule.linkedAccountId)
          ?.currency
  const accountOptions = (accounts.data ?? []).filter(
    (account) => ruleCurrency === undefined || account.currency === ruleCurrency
  )

  const findLabel = <T extends { id: number; name: string }>(
    rows: T[] | undefined,
    id: number | null | undefined
  ) => rows?.find((row) => row.id === id)?.name

  const dayOptions =
    frequency === 'Weekly'
      ? Array.from({ length: 7 }, (_, index) => index + 1)
      : Array.from({ length: 31 }, (_, index) => index + 1)

  return (
    <FormSheet
      title={rule === null ? t('recurring.new') : t('recurring.edit-title')}
      submitLabel={isSaving ? t('recurring.saving') : t('recurring.save')}
      cancelLabel={t('recurring.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) =>
        onSubmit(
          type === 'Expense' ? values : { ...values, defaultSplit: null }
        )
      )}
    >
      <div className="flex flex-col gap-4">
        <Field data-invalid={errors.receiverId !== undefined}>
          <FieldLabel htmlFor="recurring-receiver">
            {t('recurring.receiver')}
            <RequiredMark />
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
            <RequiredMark />
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
            <RequiredMark />
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
              {accountOptions.map((account) => (
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
          locale={formattingLocale()}
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
            <RequiredMark />
          </FieldLabel>
          <Select
            value={frequency}
            onValueChange={(value) => {
              setValue('frequency', value as Frequency, {
                shouldValidate: true,
              })
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
              <RequiredMark />
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
              <RequiredMark />
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
      {type === 'Expense' ? (
        <SplitSection
          idPrefix="recurring-split"
          value={defaultSplit}
          onChange={(next) =>
            setValue('defaultSplit', next, { shouldValidate: true })
          }
          amount={amount}
          currency={
            accounts.data?.find((account) => account.id === accountId)
              ?.currency ?? mainCurrency
          }
          payerUserId={paidByUserId}
        />
      ) : null}
    </FormSheet>
  )
}
