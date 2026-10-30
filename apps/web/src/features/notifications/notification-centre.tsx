import { BellOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { NotificationItem } from './notification-item.js'
import { PushToggle } from './push-toggle.js'
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from './use-notifications.js'

export function NotificationCentre({
  onOpenPreferences,
}: {
  onOpenPreferences: () => void
}) {
  const { t } = useTranslation()
  const notifications = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const unread = notifications.data?.unread ?? 0

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-medium">{t('notifications.title')}</h2>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={unread === 0 || markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          {t('notifications.mark-all-read')}
        </Button>
      </div>
      <Separator />
      <div className="max-h-80 overflow-y-auto">
        {notifications.isPending ? (
          <Skeleton className="m-4 h-16" />
        ) : notifications.isError ? (
          <p className="p-4 text-sm text-destructive">
            {t('notifications.error')}
          </p>
        ) : notifications.data.items.length === 0 ? (
          <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <BellOff aria-hidden className="size-4" />
            {t('notifications.empty')}
          </p>
        ) : (
          <ul className="divide-y">
            {notifications.data.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </ul>
        )}
      </div>
      <Separator />
      <div className="flex flex-col gap-3 p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenPreferences}
        >
          {t('notifications.preferences')}
        </Button>
        <PushToggle />
      </div>
    </div>
  )
}
