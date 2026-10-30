import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { ShieldAlert } from 'lucide-react'

import {
  useAcknowledgeServerNotices,
  useAccountSecurity,
} from '@/lib/account-security.js'
import { useTenantSettings } from '@/lib/settings.js'
import { formattingLocale } from '@/lib/i18n.js'

export function ServerResetNotice() {
  const { t } = useTranslation()
  const { timezone } = useTenantSettings()
  const security = useAccountSecurity()
  const acknowledge = useAcknowledgeServerNotices()
  const [latest] = security.data?.serverResetNotices ?? []

  if (latest === undefined) {
    return null
  }

  const issuedOn = new Intl.DateTimeFormat(formattingLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(latest))

  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl bg-destructive/10 p-4 ring-1 ring-destructive/20 md:mx-10 md:flex-row md:items-center"
    >
      <div className="flex flex-1 items-start gap-3">
        <ShieldAlert
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">
            {t('security.server-reset.title')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('security.server-reset.description', { date: issuedOn })}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        disabled={acknowledge.isPending}
        onClick={() => acknowledge.mutate()}
      >
        {t('security.server-reset.dismiss')}
      </Button>
    </div>
  )
}
