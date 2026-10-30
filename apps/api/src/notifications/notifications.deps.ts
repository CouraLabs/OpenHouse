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

export interface NotificationsDeps {
  router: App
}

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
