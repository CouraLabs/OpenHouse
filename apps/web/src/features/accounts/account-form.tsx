import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'
import type {
  Account,
  AccountType,
  Currency,
  CreateAccountBody,
} from '@workspace/poco'
import { accountTypes, createAccountSchema, currencies } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { CurrencySelect } from '@workspace/ui/components/currency-select'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { DayMonthPicker } from '@workspace/ui/components/day-month-picker'
import { TextField } from '@workspace/ui/components/text-field'

/**
 * The fields the account form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them. Its
 * refinement is what makes the agency required for Checking and Savings and
 * the limit and close/due dates required for Credit.
 */
const accountFormSchema = createAccountSchema

type AccountFormValues = z.infer<typeof accountFormSchema>

/** The props `AccountForm` takes. */
interface AccountFormProps {
  /** The account being edited, or nothing while creating. */
  account: Account | null
  /** What a confirmed save should do; the page decides what it saves. */
  onSubmit: (body: CreateAccountBody) => void
  onCancel: () => void
  /** The error the API rejected the last save with, if it did. */
  error?: string
  /** Whether a save request is in flight, which locks the buttons. */
  isSaving?: boolean
}

/** The default values of a new account: nothing chosen, nothing typed. */
const NEW_ACCOUNT: AccountFormValues = {
  name: '',
  agency: null,
  number: undefined as unknown as number,
  type: 'Checking',
  balance: '',
  currency: 'USD',
  limit: null,
  closeDay: null,
  closeMonth: null,
  dueDay: null,
  dueMonth: null,
}

/** The fields only a Credit account carries; the other types never keep them. */
const CREDIT_ONLY_FIELDS = [
  'limit',
  'closeDay',
  'closeMonth',
  'dueDay',
  'dueMonth',
] as const

/**
 * The insert and edit form of the accounts page. Credit-only fields render
 * only while the type is Credit; switching away clears them, so a stale
 * value can never ride along into a Checking or Savings account. It renders
 * above the table; the page decides when it is open and what a submit saves.
 */
export function AccountForm({
  account,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: AccountFormProps) {
  const { t, i18n } = useTranslation()
  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    register,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: NEW_ACCOUNT,
  })

  // The form holds the account it edits: switching rows resets the fields.
  useEffect(() => {
    reset(
      account === null
        ? NEW_ACCOUNT
        : {
            name: account.name,
            agency: account.agency,
            number: account.number,
            type: account.type,
            balance: account.balance,
            currency: account.currency,
            limit: account.limit,
            closeDay: account.closeDay,
            closeMonth: account.closeMonth,
            dueDay: account.dueDay,
            dueMonth: account.dueMonth,
          }
    )
  }, [account, reset])

  const type = watch('type')
  const currency = watch('currency')
  const balance = watch('balance')
  const limit = watch('limit')
  const closeDay = watch('closeDay')
  const closeMonth = watch('closeMonth')
  const dueDay = watch('dueDay')
  const dueMonth = watch('dueMonth')
  const isCredit = type === 'Credit'

  // The month names, localized: the picker renders what the caller passes.
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(
      new Date(2000, index, 1)
    ),
  }))

  return (
    <form
      onSubmit={handleSubmit((values) =>
        // An empty agency is no agency: the wire carries null, not ''.
        onSubmit({
          ...values,
          agency: values.agency === '' ? null : values.agency,
        })
      )}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {account === null ? t('accounts.new') : t('accounts.edit-title')}
      </p>
      {/* Rows of at most four: identity first, then money and dates. The
      credit-only fields join the money row when the type is Credit. */}
      <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">
        <TextField
          type="text"
          className="h-8"
          label={t('accounts.name')}
          labelFor="account-name"
          placeholder={t('accounts.name-placeholder')}
          required
          error={errors.name}
          {...register('name')}
        />
        <TextField
          type="text"
          className="h-8"
          label={t('accounts.agency')}
          labelFor="account-agency"
          placeholder={t('accounts.agency-placeholder')}
          error={errors.agency}
          {...register('agency', {
            setValueAs: (value) => (value === '' ? null : value),
          })}
        />
        <TextField
          type="text"
          className="h-8"
          label={t('accounts.number')}
          labelFor="account-number"
          placeholder={t('accounts.number-placeholder')}
          inputMode="numeric"
          required
          error={errors.number}
          {...register('number', { valueAsNumber: true })}
        />
        <Field data-invalid={errors.type !== undefined}>
          <FieldLabel htmlFor="account-type">
            {t('accounts.type')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <Select
            value={type}
            onValueChange={(value) => {
              const nextType = value as AccountType
              setValue('type', nextType, { shouldValidate: true })
              // Leaving Credit leaves the credit-only fields behind: they
              // are cleared, so a stale limit or date never rides along.
              if (nextType !== 'Credit') {
                for (const field of CREDIT_ONLY_FIELDS) {
                  setValue(field, null)
                }
              }
            }}
            items={accountTypes.map((value) => ({
              label: t(`accounts.type-${value.toLowerCase()}`),
              value,
            }))}
          >
            <SelectTrigger
              id="account-type"
              className="w-full"
              size="sm"
              aria-invalid={errors.type !== undefined}
            >
              <SelectValue placeholder={t('accounts.type-placeholder')}>
                {type !== undefined
                  ? t(`accounts.type-${type.toLowerCase()}`)
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`accounts.type-${value.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError
            errors={errors.type !== undefined ? [errors.type] : undefined}
          />
        </Field>
        <MoneyField
          locale={i18n.language}
          className="h-8"
          label={t('accounts.balance')}
          labelFor="account-balance"
          placeholder={t('accounts.amount-placeholder')}
          value={balance}
          onValueChange={(value) =>
            setValue('balance', value, { shouldValidate: true })
          }
          error={errors.balance}
          required
        />
        <Field data-invalid={errors.currency !== undefined}>
          <FieldLabel htmlFor="account-currency">
            {t('accounts.currency')}
            <span aria-hidden="true" className="text-destructive">
              *
            </span>
          </FieldLabel>
          <CurrencySelect
            id="account-currency"
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
            placeholder={t('accounts.currency-placeholder')}
            invalid={errors.currency !== undefined}
            // The currency is frozen once the account exists: every
            // transaction and balance already recorded is denominated in it.
            disabled={account !== null}
          />
          <FieldError
            errors={
              errors.currency !== undefined ? [errors.currency] : undefined
            }
          />
        </Field>
        {isCredit ? (
          <>
            <MoneyField
              locale={i18n.language}
              className="h-8"
              label={t('accounts.limit')}
              labelFor="account-limit"
              placeholder={t('accounts.amount-placeholder')}
              value={limit ?? ''}
              onValueChange={(value) =>
                setValue('limit', value, { shouldValidate: true })
              }
              error={errors.limit}
            />
            <Field data-invalid={errors.closeDay !== undefined}>
              <FieldLabel>{t('accounts.close-date')}</FieldLabel>
              <DayMonthPicker
                id="account-close"
                day={closeDay ?? null}
                month={closeMonth ?? null}
                onDayChange={(day) =>
                  setValue('closeDay', day, { shouldValidate: true })
                }
                onMonthChange={(month) =>
                  setValue('closeMonth', month, { shouldValidate: true })
                }
                monthOptions={monthOptions}
                labels={{
                  day: t('accounts.day'),
                  month: t('accounts.month'),
                  dayPlaceholder: t('accounts.day-placeholder'),
                  monthPlaceholder: t('accounts.month-placeholder'),
                }}
              />
              <FieldError
                errors={
                  errors.closeDay !== undefined
                    ? [errors.closeDay]
                    : errors.closeMonth !== undefined
                      ? [errors.closeMonth]
                      : undefined
                }
              />
            </Field>
            <Field data-invalid={errors.dueDay !== undefined}>
              <FieldLabel>{t('accounts.due-date')}</FieldLabel>
              <DayMonthPicker
                id="account-due"
                day={dueDay ?? null}
                month={dueMonth ?? null}
                onDayChange={(day) =>
                  setValue('dueDay', day, { shouldValidate: true })
                }
                onMonthChange={(month) =>
                  setValue('dueMonth', month, { shouldValidate: true })
                }
                monthOptions={monthOptions}
                labels={{
                  day: t('accounts.day'),
                  month: t('accounts.month'),
                  dayPlaceholder: t('accounts.day-placeholder'),
                  monthPlaceholder: t('accounts.month-placeholder'),
                }}
              />
              <FieldError
                errors={
                  errors.dueDay !== undefined
                    ? [errors.dueDay]
                    : errors.dueMonth !== undefined
                      ? [errors.dueMonth]
                      : undefined
                }
              />
            </Field>
          </>
        ) : null}
      </div>
      {error !== undefined ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? t('accounts.saving') : t('accounts.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={onCancel}
        >
          {t('accounts.cancel')}
        </Button>
      </div>
    </form>
  )
}
