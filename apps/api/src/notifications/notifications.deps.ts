import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { NotificationPreferencesRepository } from './notification-preferences.repository.js'
import { NotificationRepository } from './notification.repository.js'
import { NotificationService } from './notification.service.js'
import { notificationsRoutes } from './notifications.routes.js'
import { PushService } from './push.service.js'
import { PushSubscriptionRepository } from './push-subscription.repository.js'
import { WebPushTransport } from './push-transport.js'

/** The notifications feature's wiring: its routes. */
export interface NotificationsDeps {
  router: App
}

/**
 * Builds the notifications feature's services from the request's
 * dependencies — the explicit composition the DI module once did. Push is
 * enabled only when the VAPID pair is configured (`config.push`); without
 * it the transport is disabled and everything else runs as usual. The
 * services are cheap objects, rebuilt per request from the same handles.
 */
export function notificationsDeps(
  db: Database,
  config: Config,
  clock: SystemClock
): NotificationsDeps {
  const notifications = new NotificationService(
    new NotificationRepository(db),
    new NotificationPreferencesRepository(db),
    clock
  )
  const push = new PushService(
    new PushSubscriptionRepository(db),
    new WebPushTransport(config.push)
  )

  return { router: notificationsRoutes({ notifications, push }) }
}
