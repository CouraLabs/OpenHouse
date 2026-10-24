import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'

import {
  useCalendarFeed,
  useRemoveCalendarFeed,
  useRotateCalendarFeed,
} from './use-notifications.js'

/** The address a calendar app subscribes to: the API's origin plus the
 * feed path. */
function feedUrl(path: string): string {
  return `${window.location.origin}/api${path}`
}

/**
 * The secret `.ics` calendar feed: create it, copy its URL into Google or
 * Apple Calendar, replace the secret if it leaked, or delete it. Anyone
 * holding the URL can read the feed, so it is shown only here.
 */
export function CalendarFeedSection() {
  const { t } = useTranslation()
  const feed = useCalendarFeed()
  const rotate = useRotateCalendarFeed()
  const remove = useRemoveCalendarFeed()
  const [copied, setCopied] = useState(false)
  const path = feed.data?.path ?? null

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{t('notifications.calendar')}</h3>
      <p className="text-sm text-muted-foreground">
        {t('notifications.calendar-description')}
      </p>
      {path === null ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rotate.isPending || feed.isPending}
            onClick={() => rotate.mutate()}
          >
            {t('notifications.calendar-create')}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              readOnly
              aria-label={t('notifications.calendar')}
              value={feedUrl(path)}
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(feedUrl(path)).then(() => {
                  setCopied(true)
                })
              }}
            >
              {copied ? t('notifications.copied') : t('notifications.copy')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={rotate.isPending}
              onClick={() => {
                setCopied(false)
                rotate.mutate()
              }}
            >
              {t('notifications.calendar-rotate')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              {t('notifications.calendar-remove')}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
