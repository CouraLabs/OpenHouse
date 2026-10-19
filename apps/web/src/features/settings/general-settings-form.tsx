import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type {
  Currency,
  CurrencyChangeConflict,
  UpdateSettingsBody,
} from '@workspace/poco'
import { currencies, updateSettingsSchema } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { CurrencySelect } from '@workspace/ui/components/currency-select'
import { Field, FieldError, FieldLabel } from '@workspace/ui/components/field'
import { TimeZoneCombobox } from '@workspace/ui/components/time-zone-combobox'

import { ApiError } from '@/lib/api.js'
import { useSaveSettings, useTenantSettings } from '@/lib/settings.js'
import { CurrencyChangeDialog } from './currency-change-dialog.js'
import { RequiredMark } from './required-mark.js'

/** The 409 body a main-currency change answers until it is confirmed, or
 * nothing for any other failure. */
function currencyConflictOf(error: unknown): CurrencyChangeConflict | null {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'limits' in error.body &&
    'goals' in error.body
  ) {
    return error.body as CurrencyChangeConflict
  }

  return null
}

/**
 * The owner's General section: the tenant's time zone and main currency.
 * The rules are the poco schema the API runs. Changing the zone only moves
 * future evaluations of "today"; stored calendar days never shift. Changing
 * the main currency re-denominates limits and goals without converting
 * them, so when there are any, the API asks first and a dialog confirms.
 */
export function GeneralSettingsForm() {
  const { t } = useTranslation()
  const settings = useTenantSettings()
  const save = useSaveSettings()
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateSettingsBody>({
    resolver: zodResolver(updateSettingsSchema),
    defaultValues: {
      timezone: settings.timezone,
      mainCurrency: settings.mainCurrency,
    },
  })

  const timezone = watch('timezone')
  const mainCurrency = watch('mainCurrency')
  // The save the API asked to confirm, with what it would re-denominate.
  const [unconfirmed, setUnconfirmed] = useState<{
    values: UpdateSettingsBody
    conflict: CurrencyChangeConflict
  } | null>(null)

  const submit = (values: UpdateSettingsBody) =>
    save.mutate(values, {
      onSuccess: () => setUnconfirmed(null),
      onError: (error) => {
        const conflict = currencyConflictOf(error)

        if (conflict !== null) {
          setUnconfirmed({ values, conflict })
        }
      },
    })

  // The confirmation is the dialog's to show, not an error under the form.
  const saveError =
    save.isError && currencyConflictOf(save.error) === null
      ? save.error instanceof Error
        ? save.error.message
        : t('settings.error')
      : undefined

  return (
    <>
      <form
        onSubmit={handleSubmit((values) => submit(values))}
        className="flex flex-col gap-4 rounded-lg border p-4"
        noValidate
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t('settings.general.title')}</p>
          <p className="text-sm text-muted-foreground">
            {t('settings.general.description')}
          </p>
        </div>
        <div className="grid items-start gap-3 md:grid-cols-2">
          <Field data-invalid={errors.timezone !== undefined}>
            <FieldLabel htmlFor="settings-timezone">
              {t('settings.general.timezone')}
              <RequiredMark />
            </FieldLabel>
            <TimeZoneCombobox
              id="settings-timezone"
              value={timezone}
              onValueChange={(value) =>
                setValue('timezone', value, { shouldValidate: true })
              }
              placeholder={t('settings.general.timezone-placeholder')}
              emptyLabel={t('settings.general.timezone-empty')}
              invalid={errors.timezone !== undefined}
            />
            <FieldError
              errors={
                errors.timezone !== undefined ? [errors.timezone] : undefined
              }
            />
          </Field>
          <Field data-invalid={errors.mainCurrency !== undefined}>
            <FieldLabel htmlFor="settings-currency">
              {t('settings.general.main-currency')}
              <RequiredMark />
            </FieldLabel>
            <CurrencySelect
              id="settings-currency"
              value={mainCurrency}
              onValueChange={(value) =>
                setValue('mainCurrency', value as Currency, {
                  shouldValidate: true,
                })
              }
              codes={currencies}
              labels={{
                USD: t('currency.USD'),
                BRL: t('currency.BRL'),
                EUR: t('currency.EUR'),
              }}
              placeholder={t('settings.general.main-currency-placeholder')}
              invalid={errors.mainCurrency !== undefined}
            />
            <FieldError
              errors={
                errors.mainCurrency !== undefined
                  ? [errors.mainCurrency]
                  : undefined
              }
            />
          </Field>
        </div>
        {saveError !== undefined ? (
          <p className="text-sm text-destructive">{saveError}</p>
        ) : null}
        {save.isSuccess ? (
          <p className="text-sm text-muted-foreground">{t('settings.saved')}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t('settings.saving') : t('settings.save')}
          </Button>
        </div>
      </form>
      <CurrencyChangeDialog
        conflict={unconfirmed?.conflict ?? null}
        currency={unconfirmed?.values.mainCurrency ?? mainCurrency}
        isPending={save.isPending}
        onCancel={() => {
          setUnconfirmed(null)
          save.reset()
        }}
        onConfirm={() => {
          if (unconfirmed !== null) {
            submit({ ...unconfirmed.values, confirmCurrencyChange: true })
          }
        }}
      />
    </>
  )
}
