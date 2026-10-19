import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { TimeZoneCombobox } from '@workspace/ui/components/time-zone-combobox'
import { Globe } from 'lucide-react'

import { useSession } from '@/lib/auth.js'
import { browserTimeZone, useSaveSettings } from '@/lib/settings.js'

/**
 * Asks the owner of a migrated tenant — still on the `UTC` placeholder — to
 * confirm the tenant's time zone, prefilled with the browser's. Saving
 * confirms it and the banner goes away; members never see it.
 */
export function TimezoneConfirmBanner() {
  const { t } = useTranslation()
  const session = useSession()
  const save = useSaveSettings()
  const settings = session.data?.settings
  const [timezone, setTimezone] = useState(
    () => browserTimeZone() ?? settings?.timezone ?? 'UTC'
  )

  if (
    session.data == null ||
    settings === undefined ||
    session.data.user.role !== 'owner' ||
    settings.timezoneConfirmed
  ) {
    return null
  }

  return (
    <div className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/15 md:mx-10 md:flex-row md:items-center">
      <div className="flex flex-1 items-start gap-3">
        <Globe aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            {t('settings.confirm-timezone.title')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('settings.confirm-timezone.description')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <TimeZoneCombobox
          value={timezone}
          onValueChange={setTimezone}
          placeholder={t('settings.general.timezone-placeholder')}
          emptyLabel={t('settings.general.timezone-empty')}
          className="w-64"
        />
        <Button
          disabled={save.isPending}
          onClick={() =>
            save.mutate({ timezone, mainCurrency: settings.mainCurrency })
          }
        >
          {save.isPending
            ? t('settings.saving')
            : t('settings.confirm-timezone.confirm')}
        </Button>
      </div>
      {save.isError ? (
        <p className="text-sm text-destructive">
          {save.error instanceof Error
            ? save.error.message
            : t('settings.error')}
        </p>
      ) : null}
    </div>
  )
}
