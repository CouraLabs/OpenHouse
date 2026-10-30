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
              variant="ghost"
              size="icon-sm"
              className="relative rounded-full"
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
              className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-medium text-white"
            >
              {unread > BADGE_MAX ? `${BADGE_MAX}+` : unread}
            </span>
          ) : null}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-0 p-0">
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
