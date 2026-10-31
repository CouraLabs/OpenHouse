import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'

import { NotificationCentre } from '@/features/notifications/notification-centre.js'
import { NotificationPreferencesDialog } from '@/features/notifications/notification-preferences-dialog.js'
import { useNotifications } from '@/features/notifications/use-notifications.js'

const BADGE_MAX = 9

export function NotificationBell() {
  const { t } = useTranslation()
  const notifications = useNotifications()
  const [menuOpen, setMenuOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const unread = notifications.data?.unread ?? 0

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              className="relative"
              aria-label={
                unread > 0
                  ? t('notifications.bell-unread', { count: unread })
                  : t('notifications.bell')
              }
            />
          }
        >
          <Bell aria-hidden />
          {unread > 0 ? (
            <span
              aria-hidden
              title={unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread)}
              className="absolute top-2 right-2.5 size-2 rounded-full bg-data-orange ring-2 ring-card"
            />
          ) : null}
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-96 max-w-[calc(100vw-2rem)] gap-0 p-0"
        >
          <NotificationCentre
            onOpenPreferences={() => {
              setMenuOpen(false)
              setPreferencesOpen(true)
            }}
          />
        </PopoverContent>
      </Popover>
      <NotificationPreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  )
}
