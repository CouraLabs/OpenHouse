import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'

import { usePushSubscription } from './use-push-subscription.js'

export function PushToggle() {
  const { t } = useTranslation()
  const push = usePushSubscription()

  if (!push.serverEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('notifications.push-unavailable')}
      </p>
    )
  }

  if (push.needsInstall) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('notifications.push-ios-hint')}
      </p>
    )
  }

  if (!push.supported) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('notifications.push-unsupported')}
      </p>
    )
  }

  if (push.permission === 'denied') {
    return (
      <p className="text-sm text-muted-foreground">
        {t('notifications.push-denied')}
      </p>
    )
  }

  const failed = push.enable.isError || push.disable.isError

  return (
    <div className="flex flex-col gap-2">
      {push.subscribed ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={push.disable.isPending}
          onClick={() => push.disable.mutate()}
        >
          {t('notifications.push-off')}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          disabled={push.enable.isPending}
          onClick={() => push.enable.mutate()}
        >
          {t('notifications.push-on')}
        </Button>
      )}
      {failed ? (
        <p className="text-sm text-destructive">
          {t('notifications.push-error')}
        </p>
      ) : null}
    </div>
  )
}
