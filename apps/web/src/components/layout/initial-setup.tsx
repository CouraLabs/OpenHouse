import { RequiredMark } from '@workspace/ui/components/required-mark'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { currencies, type Currency } from '@workspace/dto'
import { BrandMark } from '@workspace/ui/components/brand-mark'
import { Button } from '@workspace/ui/components/button'
import { CurrencySelect } from '@workspace/ui/components/currency-select'
import { Field, FieldLabel } from '@workspace/ui/components/field'
import { TimeZoneCombobox } from '@workspace/ui/components/time-zone-combobox'

import { useSignOut } from '@/lib/auth.js'
import {
  browserTimeZone,
  useSaveSettings,
  useSettingsDefaults,
  useTenantSettings,
} from '@/lib/settings.js'

function RequiredStar() {
  return <RequiredMark />
}

export function InitialSetup({ tenantName }: { tenantName: string }) {
  const { t } = useTranslation()
  const settings = useTenantSettings()
  const defaults = useSettingsDefaults()
  const save = useSaveSettings()
  const signOut = useSignOut()
  const [timezone, setTimezone] = useState(
    () => browserTimeZone() ?? settings.timezone
  )
  const [pickedCurrency, setPickedCurrency] = useState<Currency | null>(null)
  const mainCurrency =
    pickedCurrency ?? defaults.data?.mainCurrency ?? settings.mainCurrency

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <form
        className="flex w-full max-w-md flex-col gap-5 rounded-2xl p-6 ring-1 ring-foreground/10"
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate({ timezone, mainCurrency })
        }}
        noValidate
      >
        <BrandMark className="size-10" />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-xl font-medium">
            {t('initial-setup.title', { name: tenantName })}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('initial-setup.description')}
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="setup-timezone">
            {t('settings.general.timezone')}
            <RequiredStar />
          </FieldLabel>
          <TimeZoneCombobox
            id="setup-timezone"
            value={timezone}
            onValueChange={setTimezone}
            placeholder={t('settings.general.timezone-placeholder')}
            emptyLabel={t('settings.general.timezone-empty')}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="setup-currency">
            {t('settings.general.main-currency')}
            <RequiredStar />
          </FieldLabel>
          <CurrencySelect
            id="setup-currency"
            value={mainCurrency}
            onValueChange={(value) => setPickedCurrency(value as Currency)}
            codes={currencies}
            labels={{
              USD: t('currency.USD'),
              BRL: t('currency.BRL'),
              EUR: t('currency.EUR'),
            }}
            placeholder={t('settings.general.main-currency-placeholder')}
          />
          <p className="text-sm text-muted-foreground">
            {t('initial-setup.currency-hint')}
          </p>
        </Field>
        {save.isError ? (
          <p className="text-sm text-destructive">
            {save.error instanceof Error
              ? save.error.message
              : t('settings.error')}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t('settings.saving') : t('initial-setup.submit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => signOut.mutate(undefined)}
          >
            {t('profile.logout')}
          </Button>
        </div>
      </form>
    </main>
  )
}
