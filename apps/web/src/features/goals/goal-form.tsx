import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type { CreateGoalBody, Currency, Goal } from '@workspace/poco'
import { createGoalSchema, currencies } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { DatePicker } from '@workspace/ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import { CurrencySelect } from '@workspace/ui/components/currency-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { TextField } from '@workspace/ui/components/text-field'

import { formatDateOnly, parseDateOnly } from '@/lib/format-date-only.js'
import { useActiveAccounts } from './use-goals.js'

/**
 * The fields the goal form holds. The rules come straight from the shared
 * poco schema — the same check the API runs, whose messages are already the
 * UX messages — so the form never re-declares them.
 */
const goalFormSchema = createGoalSchema

type GoalFormValues = z.infer<typeof goalFormSchema>

/**
 * The default values of a new goal: nothing chosen, nothing typed. Built
 * when the form opens, not at module load — the balance day is the day the
 * user opens the form, however long the tab has been alive.
 */
const newGoal = (): GoalFormValues => ({
  name: '',
  linkedAccountId: undefined as unknown as number,
  balance: '',
  balanceDt: formatDateOnly(new Date()),
  targetBalance: '',
  targetDt: undefined,
  currency: 'USD',
})

/** The props `GoalForm` takes. */
interface GoalFormProps {
  /** The goal being edited, or nothing while creating. */
  goal: Goal | null
  /** What a confirmed save should do; the dialog asks before this runs. */
  onSubmit: (body: CreateGoalBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/**
 * The insert and edit form of the goals page: a name, a dropdown of the
 * tenant's Savings accounts only, the currency, the balance with the day it
 * was taken, and the target balance with its optional deadline. It renders
 * above the table; the page decides when it is open and what a submit saves.
 */
export function GoalForm({
  goal,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: GoalFormProps) {
  const { t, i18n } = useTranslation()
  const {
    handleSubmit,
    reset,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: newGoal(),
  })

  // The form holds the goal it edits: switching rows resets the fields.
  useEffect(() => {
    reset(
      goal === null
        ? newGoal()
        : {
            name: goal.name,
            linkedAccountId: goal.linkedAccountId,
            balance: goal.balance,
            balanceDt: goal.balanceDt,
            targetBalance: goal.targetBalance,
            targetDt: goal.targetDt,
            currency: goal.currency,
          }
    )
  }, [goal, reset])

  const linkedAccountId = watch('linkedAccountId')
  const balanceDt = watch('balanceDt')
  const targetDt = watch('targetDt')
  const currency = watch('currency')
  const balance = watch('balance')
  const targetBalance = watch('targetBalance')
  const accounts = useActiveAccounts()
  // A goal tracks a Savings account: the dropdown offers only those.
  const savings = (accounts.data ?? []).filter(
    (account) => account.type === 'Savings'
  )
  // The trigger's label is rendered here, not derived by base-ui from
  // `items`: a prefilled value set while the popup is closed would
  // otherwise fall back to the placeholder.
  const selectedAccount = savings.find(
    (account) => account.id === linkedAccountId
  )

  // The earliest day a target deadline may hold: today, at local midnight.
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(values))}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {goal === null ? t('goals.new') : t('goals.edit-title')}
      </p>
      {/* Two rows of at most four: identity, then the money and the dates. */}
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
            onValueChange={(value) => {
              setValue('linkedAccountId', value as number, {
                shouldValidate: true,
              })

              // A goal tracks the account's money: the currency follows
              // the account, so progress is never compared across
              // currencies — the same rule the API enforces.
              const account = savings.find((item) => item.id === value)

              if (account !== undefined) {
                setValue('currency', account.currency, {
                  shouldValidate: true,
                })
              }
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
        </Field>
        <Field data-invalid={errors.currency !== undefined}>
          <FieldLabel htmlFor="goal-currency">
            {t('goals.currency')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <CurrencySelect
            id="goal-currency"
            value={currency}
            onValueChange={(value) =>
              setValue('currency', value as Currency, { shouldValidate: true })
            }
            codes={currencies}
            labels={{
              USD: t('currency.USD'),
              BRL: t('currency.BRL'),
              EUR: t('currency.EUR'),
            }}
            placeholder={t('goals.currency-placeholder')}
            invalid={errors.currency !== undefined}
          />
          <FieldError
            errors={
              errors.currency !== undefined ? [errors.currency] : undefined
            }
          />
        </Field>
        <MoneyField
          locale={i18n.language}
          className="h-8"
          label={t('goals.balance')}
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
            locale={i18n.language}
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
          locale={i18n.language}
          className="h-8"
          label={t('goals.target-balance')}
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
            locale={i18n.language}
            // A deadline cannot sit in the past: today and later only.
            disabledBefore={today}
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
