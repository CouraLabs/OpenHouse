import { useTranslation } from 'react-i18next'
import type { TenantUser } from '@workspace/poco'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { ExportJobPanel } from './export-job-panel.js'

/** The props `MemberExportDialog` takes. */
interface MemberExportDialogProps {
  /** The member whose data is exported, or nothing while closed. */
  user: TenantUser | null
  onClose: () => void
}

/**
 * Exports one member's data (LGPD/GDPR portability): their profile and the
 * rows they created, as a ZIP delivered in the app. The panel is keyed by
 * the member so reopening starts a fresh run.
 */
export function MemberExportDialog({ user, onClose }: MemberExportDialogProps) {
  const { t } = useTranslation()
  const name = user?.name ?? ''

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(next) => {
        if (!next) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('settings.member-export.title', { name })}
          </DialogTitle>
          <DialogDescription>
            {t('settings.member-export.description', { name })}
          </DialogDescription>
        </DialogHeader>
        {user !== null ? (
          <ExportJobPanel
            key={user.id}
            body={{ scope: 'member', userId: user.id }}
            startLabel={t('settings.member-export.start')}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
