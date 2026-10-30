import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { NotificationPreferencesForm } from './notification-preferences-form.js'
import { useNotificationPreferences } from './use-notifications.js'

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const preferences = useNotificationPreferences()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('notifications.preferences')}</DialogTitle>
          <DialogDescription>
            {t('notifications.preferences-description')}
          </DialogDescription>
        </DialogHeader>
        {preferences.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : preferences.isError ? (
          <p className="text-sm text-destructive">{t('notifications.error')}</p>
        ) : (
          <NotificationPreferencesForm
            initial={preferences.data}
            onSaved={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
