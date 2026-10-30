import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateGoalBody, Goal } from '@workspace/poco'
import { createGoalSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
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
import { useActiveAccounts } from './use-goals.js'
import { formattingLocale } from '@/lib/i18n.js'

const goalFormSchema = createGoalSchema

type GoalFormValues = z.infer<typeof goalFormSchema>

const newGoal = (today: string): GoalFormValues => ({
  name: '',
  linkedAccountId: undefined as unknown as number,
  balance: '',
  balanceDt: today,
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
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues:
      goal === null
        ? newGoal(today)
        : {
            name: goal.name,
            linkedAccountId: goal.linkedAccountId,
            balance: goal.balance,
            balanceDt: goal.balanceDt,
            targetBalance: goal.targetBalance,
            targetDt: goal.targetDt,
          },
  })

  const linkedAccountId = watch('linkedAccountId')
  const balanceDt = watch('balanceDt')
  const targetDt = watch('targetDt')
  const balance = watch('balance')
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

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {goal === null ? t('goals.new') : t('goals.edit-title')}
      </p>
      {}
      <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">
        <TextField
          type="text"
          className="col-span-2 h-8"
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
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={linkedAccountId}
            onValueChange={(value) =>
              setValue('linkedAccountId', value as number, {
                shouldValidate: true,
              })
            }
            items={savings.map((account) => ({
              label: account.name,
              value: account.id,
            }))}
            disabled={accounts.isPending}
          >
            <SelectTrigger
              id="goal-account"
              className="w-full"
              size="sm"
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
          className="h-8"
          label={t('goals.balance-in', { currency: mainCurrency })}
          labelFor="goal-balance"
          placeholder={t('goals.amount-placeholder')}
          value={balance}
          onValueChange={(value) =>
            setValue('balance', value, { shouldValidate: true })
          }
          error={errors.balance}
          required
        />
        <Field data-invalid={errors.balanceDt !== undefined}>
          <FieldLabel htmlFor="goal-balance-dt">
            {t('goals.balance-date')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <DatePicker
            id="goal-balance-dt"
            className="h-8"
            locale={formattingLocale()}
            value={parseDateOnly(balanceDt)}
            onChange={(date) =>
              setValue('balanceDt', formatDateOnly(date), {
                shouldValidate: true,
              })
            }
            labels={{
              placeholder: t('goals.date-placeholder'),
              today: t('goals.today'),
            }}
          />
          <FieldError
            errors={
              errors.balanceDt !== undefined ? [errors.balanceDt] : undefined
            }
          />
        </Field>
        <MoneyField
          locale={formattingLocale()}
          className="h-8"
          label={t('goals.target-balance-in', { currency: mainCurrency })}
          labelFor="goal-target-balance"
          placeholder={t('goals.amount-placeholder')}
          value={targetBalance}
          onValueChange={(value) =>
            setValue('targetBalance', value, { shouldValidate: true })
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
            className="h-8"
            locale={formattingLocale()}
            disabledBefore={earliestTargetDt}
            value={parseDateOnly(targetDt)}
            onChange={(date) =>
              setValue('targetDt', formatDateOnly(date), {
                shouldValidate: true,
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
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('goals.saving') : t('goals.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          {t('goals.cancel')}
        </Button>
      </div>
    </form>
  )
}
