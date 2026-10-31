import { useDiscardGuard } from '@/lib/use-discard-guard.js'
import { FormSheet } from '@workspace/ui/components/form-sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateRecurringTransactionBody, Frequency, RecurringTransaction } from '@workspace/dto'
import { createRecurringTransactionSchema, transactionTypes } from '@workspace/dto'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { RadioOption } from '@workspace/ui/components/radio-option'
import { MoneyField } from '@workspace/ui/components/money-field'
import { RadioGroup } from '@workspace/ui/components/radio-group'
import { SearchPick } from '@workspace/ui/components/search-pick'

import { ScheduleFields } from './schedule-fields.js'
import { SplitSection } from '@/components/split-section.js'
import { useMainCurrency, useTenantToday } from '@/lib/settings.js'
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
  const today = useTenantToday()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
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

  const guard = useDiscardGuard(isDirty)

  return (
    <FormSheet
      {...guard}
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
        <Field data-invalid={errors.type !== undefined}>
          <FieldLabel id="recurring-type-label">
            {t('recurring.type')}
          </FieldLabel>
          <RadioGroup
            aria-labelledby="recurring-type-label"
            value={type}
            onValueChange={(value) =>
              setValue('type', value as RecurringFormValues['type'], {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            className="grid-cols-2"
          >
            {transactionTypes.map((value) => (
              <RadioOption key={value} value={value}>
                {t(`recurring.type-${value.toLowerCase()}`)}
              </RadioOption>
            ))}
          </RadioGroup>
          {errors.type !== undefined ? (
            <FieldError>{errors.type.message}</FieldError>
          ) : null}
        </Field>
        <MoneyField
          locale={formattingLocale()}
          label={t('recurring.amount')}
          labelFor="recurring-amount"
          placeholder={t('recurring.amount-placeholder')}
          value={amount}
          onValueChange={(value) =>
            setValue('amount', value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          error={errors.amount}
          required
          className="h-14 text-2xl font-semibold tabular-nums"
        />
        <SearchPick
          id="recurring-account"
          label={t('recurring.account')}
          placeholder={t('recurring.account-placeholder')}
          emptyLabel={t('recurring.no-match')}
          required
          value={accountId === undefined ? undefined : String(accountId)}
          options={accountOptions.map((account) => ({
            value: String(account.id),
            label: account.name,
          }))}
          error={errors.linkedAccountId?.message}
          onChange={(value) =>
            setValue('linkedAccountId', Number(value), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
        <SearchPick
          id="recurring-category"
          label={t('recurring.category')}
          placeholder={t('recurring.category-placeholder')}
          emptyLabel={t('recurring.no-match')}
          required
          value={categoryId === undefined ? undefined : String(categoryId)}
          options={(categories.data ?? []).map((category) => ({
            value: String(category.id),
            label: category.name,
          }))}
          error={errors.categoryId?.message}
          onChange={(value) =>
            setValue('categoryId', Number(value), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
        <SearchPick
          id="recurring-receiver"
          label={t('recurring.receiver')}
          placeholder={t('recurring.receiver-placeholder')}
          emptyLabel={t('recurring.no-match')}
          required
          value={receiverId === undefined ? undefined : String(receiverId)}
          options={(receivers.data ?? []).map((receiver) => ({
            value: String(receiver.id),
            label: receiver.name,
          }))}
          error={errors.receiverId?.message}
          onChange={(value) =>
            setValue('receiverId', Number(value), {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
        <ScheduleFields
          frequency={frequency}
          frequencyDay={frequencyDay ?? undefined}
          frequencyMonth={frequencyMonth ?? undefined}
          today={today}
          errors={errors}
          onFrequencyChange={(value) => {
            setValue('frequency', value, {
              shouldValidate: true,
              shouldDirty: true,
            })
            setValue('frequencyDay', undefined, { shouldDirty: true })
            setValue('frequencyMonth', undefined, { shouldDirty: true })
          }}
          onDayChange={(value) =>
            setValue('frequencyDay', value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          onMonthChange={(value) =>
            setValue('frequencyMonth', value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
        />
      </div>
      {type === 'Expense' ? (
        <SplitSection
          idPrefix="recurring-split"
          value={defaultSplit}
          onChange={(next) =>
            setValue('defaultSplit', next, {
              shouldValidate: true,
              shouldDirty: true,
            })
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
