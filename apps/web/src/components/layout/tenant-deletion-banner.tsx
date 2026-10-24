import { Button } from '@workspace/ui/components/button'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { useSession } from '@/lib/auth.js'
import { useCancelTenantDeletion } from '@/features/settings/use-tenant-deletion.js'

/**
 * Tells everyone who signs in that the household is scheduled for deletion,
 * and on which day; the owner can cancel it from here.
 */
export function TenantDeletionBanner() {
  const { t, i18n } = useTranslation()
  const session = useSession()
  const cancel = useCancelTenantDeletion()
  const deletionDate = session.data?.tenant.deletionDate ?? null

  if (deletionDate === null) {
    return null
  }

  const date = formatDayLabel(deletionDate, i18n.language, {
    dateStyle: 'long',
  })

  return (
    <div
      role="alert"
      className="mx-4 mt-4 flex flex-col gap-3 rounded-2xl bg-destructive/10 p-4 ring-1 ring-destructive/20 md:mx-10 md:flex-row md:items-center"
    >
      <div className="flex flex-1 items-start gap-3">
        <Trash2
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-destructive"
        />
        <p className="text-sm font-medium">
          {t('deletion.scheduled', { date })}
        </p>
      </div>
      {session.data?.user.role === 'owner' ? (
        <Button
          variant="outline"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
        >
          {t('deletion.cancel')}
        </Button>
      ) : null}
    </div>
  )
}
