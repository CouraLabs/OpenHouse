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

interface MemberExportDialogProps {
  user: TenantUser | null
  onClose: () => void
}

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
