import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'

import {
  useAccountSecurity,
  useGenerateRecoveryCodes,
} from '@/lib/account-security.js'
import { useTenantSettings } from '@/lib/settings.js'
import { RecoveryCodesList } from './recovery-codes-list.js'
import { formattingLocale } from '@/lib/i18n.js'

export function RecoveryCodesSection() {
  const { t } = useTranslation()
  const { timezone } = useTenantSettings()
  const security = useAccountSecurity()
  const generate = useGenerateRecoveryCodes()
  const [confirming, setConfirming] = useState(false)

  const recovery = security.data?.recoveryCodes
  const hasCodes = recovery !== undefined && recovery.remaining > 0

  const run = () =>
    generate.mutate(undefined, { onSettled: () => setConfirming(false) })

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{t('settings.recovery.title')}</p>
        <p className="text-sm text-muted-foreground">
          {t('settings.recovery.description')}
        </p>
      </div>
      {generate.data !== undefined ? (
        <RecoveryCodesList codes={generate.data.codes} />
      ) : (
        <p className="text-sm">
          {recovery === undefined || recovery.generatedAt === null
            ? t('settings.recovery.none')
            : t('settings.recovery.remaining', {
                count: recovery.remaining,
                date: new Intl.DateTimeFormat(formattingLocale(), {
                  dateStyle: 'medium',
                  timeZone: timezone,
                }).format(new Date(recovery.generatedAt)),
              })}
        </p>
      )}
      {generate.isError ? (
        <p className="text-sm text-destructive">
          {generate.error instanceof Error
            ? generate.error.message
            : t('settings.error')}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          variant={generate.data === undefined ? 'default' : 'outline'}
          disabled={generate.isPending || security.isPending}
          onClick={() => (hasCodes ? setConfirming(true) : run())}
        >
          {generate.isPending
            ? t('settings.recovery.generating')
            : recovery?.generatedAt == null
              ? t('settings.recovery.generate')
              : t('settings.recovery.regenerate')}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        destructive
        title={t('settings.recovery.regenerate-title')}
        description={t('settings.recovery.regenerate-description')}
        confirmLabel={t('settings.recovery.regenerate-confirm')}
        pendingLabel={t('settings.recovery.generating')}
        cancelLabel={t('settings.cancel')}
        isPending={generate.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={run}
      />
    </section>
  )
}
