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
import { Checkbox } from '@workspace/ui/components/checkbox'
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
import { TextField } from '@workspace/ui/components/text-field'

/**
 * The fields the account form holds. The rules come straight from the
 * shared poco schema — the same check the API runs, whose messages are
 * already the UX messages — so the form never re-declares them. Its
 * refinement is what makes the agency and the number required for Checking
 * and Savings and the limit and close/due days required for a Credit Card.
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
  number: null,
  type: 'Checking',
  balance: '',
  currency: 'USD',
  limit: null,
  closeDay: null,
  dueDay: null,
  isDefault: false,
}

/** The fields only a Credit Card carries; the other types never keep them. */
const CARD_ONLY_FIELDS = ['limit', 'closeDay', 'dueDay'] as const

/** The types that have no bank behind them, so no agency field either. */
const AGENCY_LESS_TYPES: readonly AccountType[] = ['Wallet', 'Credit Card']

/** The types that carry no bank account number, so no number field either. */
const NUMBER_LESS_TYPES: readonly AccountType[] = ['Wallet', 'Credit Card']

/** The days of the month a close or due date can fall on. */
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1)

/**
 * The insert and edit form of the accounts page. Card-only fields render
 * only while the type is Credit Card, and the agency and the number only
 * while the account sits at a bank; switching away clears what the previous
 * type owned, so a stale value can never ride along. It renders above the
 * table; the page decides when it is open and what a submit saves.
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
            // A wallet or card has no agency or number — a legacy row that
            // carried one must not fail the schema's check on a field with
            // no input.
            agency: AGENCY_LESS_TYPES.includes(account.type)
              ? null
              : account.agency,
            number: NUMBER_LESS_TYPES.includes(account.type)
              ? null
              : account.number,
            type: account.type,
            balance: account.balance,
            currency: account.currency,
            limit: account.limit,
            closeDay: account.closeDay,
            dueDay: account.dueDay,
            isDefault: account.isDefault,
          }
    )
  }, [account, reset])

  const type = watch('type')
  const currency = watch('currency')
  const balance = watch('balance')
  const limit = watch('limit')
  const closeDay = watch('closeDay')
  const dueDay = watch('dueDay')
  const isDefault = watch('isDefault')
  const isCard = type === 'Credit Card'
  const hasAgency = !AGENCY_LESS_TYPES.includes(type)
  const hasNumber = !NUMBER_LESS_TYPES.includes(type)

  return (
    <form
      onSubmit={handleSubmit((values) =>
        // An empty agency is no agency: the wire carries null, not '' — and
        // a wallet or card has no agency or number at all, even when the row
        // once did.
        onSubmit({
          ...values,
          agency:
            values.agency === '' || AGENCY_LESS_TYPES.includes(values.type)
              ? null
              : values.agency,
          number: NUMBER_LESS_TYPES.includes(values.type)
            ? null
            : values.number,
        })
      )}
      className="flex flex-col gap-4 rounded-lg border p-4"
      noValidate
    >
      <p className="text-sm font-medium">
        {account === null ? t('accounts.new') : t('accounts.edit-title')}
      </p>
      {/* Rows of at most four: identity first, then money and dates. The
      card-only fields join the money row when the type is Credit Card. */}
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
        {hasAgency ? (
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
        ) : null}
        {hasNumber ? (
          <TextField
            type="text"
            className="h-8"
            label={t('accounts.number')}
            labelFor="account-number"
            placeholder={t('accounts.number-placeholder')}
            required
            error={errors.number}
            {...register('number', {
              setValueAs: (value) => (value === '' ? null : value),
            })}
          />
        ) : null}
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
              // Leaving Credit Card leaves the card-only fields behind, and
              // a wallet or card has no agency or number: all are cleared,
              // so a stale value never rides along into the next type.
              if (nextType !== 'Credit Card') {
                for (const field of CARD_ONLY_FIELDS) {
                  setValue(field, null)
                }
              }
              if (AGENCY_LESS_TYPES.includes(nextType)) {
                setValue('agency', null)
              }
              if (NUMBER_LESS_TYPES.includes(nextType)) {
                setValue('number', null)
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
        <Field>
          {/* The flag rides on the account, not on a type: any kind can be
              the one new transactions start in. Raising it here takes it
              from the previous holder — the API moves it, never refuses. */}
          <FieldLabel htmlFor="account-is-default">
            {t('accounts.is-default')}
          </FieldLabel>
          <Checkbox
            id="account-is-default"
            className="mt-1"
            checked={isDefault}
            onCheckedChange={(checked) =>
              setValue('isDefault', checked === true, { shouldValidate: true })
            }
          />
        </Field>
        {isCard ? (
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
              <FieldLabel htmlFor="account-close-day">
                {t('accounts.close-date')}
              </FieldLabel>
              <Select
                value={closeDay == null ? null : String(closeDay)}
                onValueChange={(value) =>
                  setValue('closeDay', value === null ? null : Number(value), {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger
                  id="account-close-day"
                  className="w-full"
                  size="sm"
                  aria-invalid={errors.closeDay !== undefined}
                >
                  {/* The selected label renders explicitly — a value set while
                      the popup was closed is not derived from the items alone. */}
                  <SelectValue placeholder={t('accounts.day-placeholder')}>
                    {closeDay != null
                      ? String(closeDay).padStart(2, '0')
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_MONTH.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {String(day).padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={
                  errors.closeDay !== undefined ? [errors.closeDay] : undefined
                }
              />
            </Field>
            <Field data-invalid={errors.dueDay !== undefined}>
              <FieldLabel htmlFor="account-due-day">
                {t('accounts.due-date')}
              </FieldLabel>
              <Select
                value={dueDay == null ? null : String(dueDay)}
                onValueChange={(value) =>
                  setValue('dueDay', value === null ? null : Number(value), {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger
                  id="account-due-day"
                  className="w-full"
                  size="sm"
                  aria-invalid={errors.dueDay !== undefined}
                >
                  <SelectValue placeholder={t('accounts.day-placeholder')}>
                    {dueDay != null
                      ? String(dueDay).padStart(2, '0')
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_MONTH.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {String(day).padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError
                errors={
                  errors.dueDay !== undefined ? [errors.dueDay] : undefined
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
