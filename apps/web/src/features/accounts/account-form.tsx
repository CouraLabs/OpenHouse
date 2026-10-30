import { FormSection } from '@workspace/ui/components/form-section'
import { useDiscardGuard } from '@/lib/use-discard-guard.js'
import { FormSheet } from '@workspace/ui/components/form-sheet'
import { RequiredMark } from '@workspace/ui/components/required-mark'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Checkbox } from '@workspace/ui/components/checkbox'
import { CurrencySelect } from '@workspace/ui/components/currency-select'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@workspace/ui/components/field'
import { MoneyField } from '@workspace/ui/components/money-field'
import { RadioGroup } from '@workspace/ui/components/radio-group'
import { RadioOption } from '@workspace/ui/components/radio-option'
import { TextField } from '@workspace/ui/components/text-field'

import { useMainCurrency } from '@/lib/settings.js'
import { AccountAdvancedFields } from './account-advanced-fields.js'
import { CardCycleFields } from './card-cycle-fields.js'
import { formattingLocale } from '@/lib/i18n.js'

const accountFormSchema = createAccountSchema

type AccountFormValues = z.input<typeof accountFormSchema>

interface AccountFormProps {
  account: Account | null
  onSubmit: (body: CreateAccountBody) => void
  onCancel: () => void
  error?: string
  isSaving?: boolean
}

const newAccount = (mainCurrency: Currency): AccountFormValues => ({
  name: '',
  agency: null,
  number: null,
  type: 'Checking',
  balance: undefined,
  currency: mainCurrency,
  spreadPct: '0',
  limit: null,
  closeDay: null,
  dueDay: null,
  closeDayInclusive: false,
  isDefault: false,
  ownership: 'personal',
})

const CARD_ONLY_FIELDS = ['limit', 'closeDay', 'dueDay'] as const

const AGENCY_LESS_TYPES: readonly AccountType[] = ['Wallet', 'Credit Card']

const NUMBER_LESS_TYPES: readonly AccountType[] = ['Wallet', 'Credit Card']

export function AccountForm({
  account,
  onSubmit,
  onCancel,
  error,
  isSaving = false,
}: AccountFormProps) {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const {
    handleSubmit,
    watch,
    setValue,
    register,
    formState: { errors, isDirty },
  } = useForm<AccountFormValues, unknown, CreateAccountBody>({
    resolver: zodResolver(accountFormSchema),
    defaultValues:
      account === null
        ? newAccount(mainCurrency)
        : {
            name: account.name,
            agency: AGENCY_LESS_TYPES.includes(account.type)
              ? null
              : account.agency,
            number: NUMBER_LESS_TYPES.includes(account.type)
              ? null
              : account.number,
            type: account.type,
            balance: account.openingBalance,
            currency: account.currency,
            spreadPct: account.spreadPct,
            limit: account.limit,
            closeDay: account.closeDay,
            dueDay: account.dueDay,
            closeDayInclusive: account.closeDayInclusive,
            isDefault: account.isDefault,
            ownership: account.ownership,
          },
  })

  const type = watch('type')
  const currency = watch('currency')
  const balance = watch('balance')
  const limit = watch('limit')
  const closeDay = watch('closeDay')
  const dueDay = watch('dueDay')
  const closeDayInclusive = watch('closeDayInclusive') ?? false
  const isDefault = watch('isDefault')
  const ownership = watch('ownership')
  const spreadPct = watch('spreadPct')
  const isCard = type === 'Credit Card'
  const hasAgency = !AGENCY_LESS_TYPES.includes(type)
  const hasNumber = !NUMBER_LESS_TYPES.includes(type)

  const guard = useDiscardGuard(isDirty)

  return (
    <FormSheet
      {...guard}
      title={account === null ? t('accounts.new') : t('accounts.edit-title')}
      submitLabel={isSaving ? t('accounts.saving') : t('accounts.save')}
      cancelLabel={t('accounts.cancel')}
      isSaving={isSaving}
      error={error}
      onCancel={onCancel}
      onSubmit={handleSubmit((values) =>
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
    >
      <div className="flex flex-col gap-4">
        <Field data-invalid={errors.type !== undefined}>
          <FieldLabel id="account-type-label">
            {t('accounts.type')}
            <RequiredMark />
          </FieldLabel>
          <RadioGroup
            aria-labelledby="account-type-label"
            value={type}
            onValueChange={(value) => {
              const nextType = value as AccountType
              setValue('type', nextType, {
                shouldValidate: true,
                shouldDirty: true,
              })
              if (nextType !== 'Credit Card') {
                for (const field of CARD_ONLY_FIELDS) {
                  setValue(field, null, { shouldDirty: true })
                }
                setValue('closeDayInclusive', false, { shouldDirty: true })
              }
              if (AGENCY_LESS_TYPES.includes(nextType)) {
                setValue('agency', null, { shouldDirty: true })
              }
              if (NUMBER_LESS_TYPES.includes(nextType)) {
                setValue('number', null, { shouldDirty: true })
              }
            }}
            className="grid-cols-2"
          >
            {accountTypes.map((value) => (
              <RadioOption key={value} value={value}>
                {t(`accounts.type-${value.toLowerCase()}`)}
              </RadioOption>
            ))}
          </RadioGroup>
          <FieldError
            errors={errors.type !== undefined ? [errors.type] : undefined}
          />
        </Field>
        <TextField
          type="text"

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
        <MoneyField
          locale={formattingLocale()}

          label={
            account === null
              ? t('accounts.balance')
              : t('accounts.opening-balance')
          }
          labelFor="account-balance"
          currency={currency}
          placeholder={t('accounts.amount-placeholder')}
          value={balance ?? undefined}
          onValueChange={(value) =>
            setValue('balance', value === '' ? undefined : value, {
              shouldValidate: true,
              shouldDirty: true,
            })
          }
          error={errors.balance}
          required={!isCard}
        />
        <Field data-invalid={errors.currency !== undefined}>
          <FieldLabel htmlFor="account-currency">
            {t('accounts.currency')}
            <RequiredMark />
          </FieldLabel>
          <CurrencySelect
            id="account-currency"
            value={currency}
            onValueChange={(value) =>
              setValue('currency', value as Currency, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            codes={currencies}
            labels={{
              USD: t('currency.USD'),
              BRL: t('currency.BRL'),
              EUR: t('currency.EUR'),
            }}
            placeholder={t('accounts.currency-placeholder')}
            invalid={errors.currency !== undefined}
            disabled={account !== null}
          />
          <FieldDescription>{t('accounts.currency-hint')}</FieldDescription>
          <FieldError
            errors={
              errors.currency !== undefined ? [errors.currency] : undefined
            }
          />
        </Field>
        {isCard ? (
          <FormSection legend={t('accounts.card-section')}>
            <MoneyField
              locale={formattingLocale()}

              label={t('accounts.limit')}
              labelFor="account-limit"
              currency={currency}
              placeholder={t('accounts.amount-placeholder')}
              value={limit ?? ''}
              onValueChange={(value) =>
                setValue('limit', value, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              error={errors.limit}
              required
            />
            <CardCycleFields
              closeDay={closeDay}
              dueDay={dueDay}
              closeDayInclusive={closeDayInclusive}
              onCloseDayChange={(day) =>
                setValue('closeDay', day, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              onDueDayChange={(day) =>
                setValue('dueDay', day, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              onCloseDayInclusiveChange={(inclusive) =>
                setValue('closeDayInclusive', inclusive, { shouldDirty: true })
              }
              errors={{ closeDay: errors.closeDay, dueDay: errors.dueDay }}
            />
          </FormSection>
        ) : null}
        <Field orientation="horizontal">
          <Checkbox
            id="account-is-default"
            checked={isDefault}
            onCheckedChange={(checked) =>
              setValue('isDefault', checked === true, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
          />
          <FieldLabel htmlFor="account-is-default">
            {t('accounts.is-default')}
          </FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <Checkbox
            id="account-shared"
            checked={ownership === 'shared'}
            onCheckedChange={(checked) =>
              setValue('ownership', checked === true ? 'shared' : 'personal', {
                shouldDirty: true,
              })
            }
          />
          <FieldContent>
            <FieldLabel htmlFor="account-shared">
              {t('accounts.shared')}
            </FieldLabel>
            <FieldDescription>{t('accounts.shared-hint')}</FieldDescription>
          </FieldContent>
        </Field>
      </div>
      <AccountAdvancedFields
        spreadPct={spreadPct}
        spreadPctInput={register('spreadPct')}
        error={errors.spreadPct}
      />
    </FormSheet>
  )
}
