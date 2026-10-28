import { useTranslation } from 'react-i18next'
import type { AppNotification } from '@workspace/poco'

import { reminderText } from './notification-text.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The lines a notification reads as: one reminder, or a digest's items. */
function linesOf(
  notification: AppNotification,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string
): string[] {
  const { body } = notification

  return body.kind === 'digest'
    ? body.items.map((item) => reminderText(item, t, locale))
    : [reminderText(body, t, locale)]
}

/**
 * One entry of the notification centre. An unread one carries a dot;
 * clicking it marks it read.
 */
export function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification
  onRead: (id: number) => void
}) {
  const { t } = useTranslation()
  const unread = notification.readAt === null
  const lines = linesOf(notification, t, formattingLocale())
  const when = new Intl.DateTimeFormat(formattingLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(notification.createdAt))

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (unread) {
            onRead(notification.id)
          }
        }}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50"
      >
        <span
          aria-hidden
          className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? 'bg-primary' : 'bg-transparent'}`}
        />
        <span className="flex min-w-0 flex-col gap-1">
          {notification.body.kind === 'digest' ? (
            <span className="text-xs font-medium text-muted-foreground">
              {t('notifications.digest', { count: lines.length })}
            </span>
          ) : null}
          {lines.map((line) => (
            <span
              key={line}
              className={`text-sm ${unread ? 'font-medium' : 'text-muted-foreground'}`}
            >
              {line}
            </span>
          ))}
          <span className="text-xs text-muted-foreground">{when}</span>
        </span>
      </button>
    </li>
  )
}
