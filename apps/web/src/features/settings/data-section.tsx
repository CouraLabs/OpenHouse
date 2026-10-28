import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Trash2 } from 'lucide-react'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { useSession } from '@/lib/auth.js'
import { DeleteTenantDialog } from './delete-tenant-dialog.js'
import { ExportJobPanel } from './export-job-panel.js'
import { useCancelTenantDeletion } from './use-tenant-deletion.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The owner's Data section: export everything the household recorded as a
 * ZIP (delivered in the app, no email), and delete the tenant after a
 * 30-day grace period the owner can cancel.
 */
export function DataSection() {
  const { t } = useTranslation()
  const session = useSession()
  const cancel = useCancelTenantDeletion()
  const [deleting, setDeleting] = useState(false)
  const deletionDate = session.data?.tenant.deletionDate ?? null

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-light tracking-tight">
          {t('settings.data.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('settings.data.export-description')}
        </p>
        <ExportJobPanel
          body={{ scope: 'tenant' }}
          startLabel={t('settings.data.export-all')}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="font-heading text-lg font-light tracking-tight">
          {t('settings.data.delete-heading')}
        </h3>
        {deletionDate === null ? (
          <>
            <p className="text-sm text-muted-foreground">
              {t('settings.data.delete-explanation')}
            </p>
            <div>
              <Button variant="destructive" onClick={() => setDeleting(true)}>
                <Trash2 />
                {t('settings.data.delete-button')}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm">
              {t('deletion.scheduled', {
                date: formatDayLabel(deletionDate, formattingLocale(), {
                  dateStyle: 'long',
                }),
              })}
            </p>
            <Button
              variant="outline"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {t('deletion.cancel')}
            </Button>
          </div>
        )}
      </section>
      <DeleteTenantDialog open={deleting} onClose={() => setDeleting(false)} />
    </div>
  )
}
