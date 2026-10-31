import { useDiscardGuard } from '@/lib/use-discard-guard.js'
import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateGoalBody, Goal } from '@workspace/dto'
import { createGoalSchema } from '@workspace/dto'
import { DatePicker } from '@workspace/ui/components/date-picker'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@workspace/ui/components/field'
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
import { useMainCurrency, useTenantToday } from '@/lib/settings.js'
import { NoSavingsAccount } from './no-savings-account.js'
import { useActiveAccounts } from './use-goals.js'
import { formattingLocale } from '@/lib/i18n.js'

const goalFormSchema = createGoalSchema

type GoalFormValues = z.infer<typeof goalFormSchema>

const newGoal = (): GoalFormValues => ({
  name: '',
  linkedAccountId: undefined as unknown as number,
  targetBalance: '',
  targetDt: undefined,
})

interface GoalFormProps {
  goal: Goal | null
  onSubmit: (body: CreateGoalBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

export function GoalForm({
  goal,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: GoalFormProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const today = useTenantToday()
  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues:
      goal === null
        ? newGoal()
        : {
            name: goal.name,
            linkedAccountId: goal.linkedAccountId,
            targetBalance: goal.targetBalance,
            targetDt: goal.targetDt,
          },
  })

  const linkedAccountId = watch('linkedAccountId')
  const targetDt = watch('targetDt')
  const targetBalance = watch('targetBalance')
  const accounts = useActiveAccounts()
  const allSavings = (accounts.data ?? []).filter(
    (account) => account.type === 'Savings'
  )
  const savings = allSavings.filter(
    (account) => account.currency === mainCurrency
  )
  const otherCurrencySavings = allSavings.length - savings.length
  const selectedAccount = savings.find(
    (account) => account.id === linkedAccountId
  )

  const earliestTargetDt = parseDateOnly(today)

  const guard = useDiscardGuard(isDirty)

  return (
    <FormSheet
      {...guard}
      title={goal === null ? t('goals.new') : t('goals.edit-title')}
      submitLabel={isSaving ? t('goals.saving') : t('goals.save')}
      cancelLabel={t('goals.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <div className="flex flex-col gap-4">
        <TextField
          type="text"
          label={t('goals.name')}
          labelFor="goal-name"
          placeholder={t('goals.name-placeholder')}
          required
          error={errors.name}
          {...register('name')}
        />
        <Field data-invalid={errors.linkedAccountId !== undefined}>
          <FieldLabel htmlFor="goal-account">
            {t('goals.account')}
            <RequiredMark />
          </FieldLabel>
          <Select
            value={linkedAccountId}
            onValueChange={(value) => {
              setValue('linkedAccountId', value as number, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }}
            items={savings.map((account) => ({
              label: account.name,
              value: account.id,
            }))}
            disabled={accounts.isPending}
          >
            <SelectTrigger
              id="goal-account"
              className="w-full"
              aria-invalid={errors.linkedAccountId !== undefined}
            >
              <SelectValue placeholder={t('goals.account-placeholder')}>
                {selectedAccount?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {savings.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            errors={
              errors.linkedAccountId !== undefined
                ? [errors.linkedAccountId]
                : undefined
            }
          />
          {!accounts.isPending && savings.length === 0 ? (
            <NoSavingsAccount />
          ) : null}
          {otherCurrencySavings > 0 ? (
            <FieldDescription>
              {t('goals.account-other-currencies', {
                count: otherCurrencySavings,
                currency: mainCurrency,
              })}
            </FieldDescription>
          ) : null}
        </Field>
        <MoneyField
          locale={formattingLocale()}
          currency={mainCurrency}

          label={t('goals.target-balance-in', { currency: mainCurrency })}
          labelFor="goal-target-balance"
          placeholder={t('goals.amount-placeholder')}
          value={targetBalance}
          onValueChange={(value) =>
            setValue('targetBalance', value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          error={errors.targetBalance}
          required
        />
        <Field data-invalid={errors.targetDt !== undefined}>
          <FieldLabel htmlFor="goal-target-dt">
            {t('goals.target-date')}
          </FieldLabel>
          <DatePicker
            id="goal-target-dt"

            locale={formattingLocale()}
            disabledBefore={earliestTargetDt}
            value={parseDateOnly(targetDt)}
            onChange={(date) =>
              setValue('targetDt', formatDateOnly(date), {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            labels={{
              placeholder: t('goals.date-placeholder'),
              today: t('goals.today'),
            }}
          />
          <FieldError
            errors={
              errors.targetDt !== undefined ? [errors.targetDt] : undefined
            }
          />
        </Field>
      </div>
    </FormSheet>
  )
}
