import { Hono } from 'hono'

import {
  notificationPreferencesSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { NotificationService } from './notification.service.js'
import type { PushService } from './push.service.js'

/**
 * The signed-in user's own notification routes: the centre behind the bell,
 * the reminder preferences, and the browser's push subscription. Everything
 * is scoped to the session's user; no body or query names one.
 */
export function notificationsRoutes(deps: {
  notifications: NotificationService
  push: PushService
}): App {
  const router: App = new Hono<AppEnv>()

  /** The latest entries and the unread count. */
  router.get('/', async (context) => {
    const session = context.get('session')

    return context.json(await deps.notifications.list(session.user.id))
  })

  /** Marks every entry read. */
  router.post('/read-all', async (context) => {
    const session = context.get('session')

    await deps.notifications.markAllRead(session.user.id)

    return context.body(null, 204)
  })

  /** The user's reminder preferences. */
  router.get('/preferences', async (context) => {
    const session = context.get('session')

    return context.json(
      await deps.notifications.getPreferences(session.tenant.id, session.user.id)
    )
  })

  /** Saves the user's reminder preferences. */
  router.put('/preferences', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, notificationPreferencesSchema)

    return context.json(
      await deps.notifications.savePreferences(
        session.tenant.id,
        session.user.id,
        body
      )
    )
  })

  /** Whether push is available, and the public key to subscribe against. */
  router.get('/push-config', (context) => context.json(deps.push.config()))

  /** Stores the browser's push subscription. */
  router.post('/push-subscriptions', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, pushSubscriptionSchema)

    await deps.push.subscribe(
      session.tenant.id,
      session.user.id,
      body,
      context.req.header('user-agent')?.slice(0, 255) ?? null
    )

    return context.body(null, 204)
  })

  /** Removes the browser's push subscription. */
  router.delete('/push-subscriptions', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, pushUnsubscribeSchema)

    await deps.push.unsubscribe(session.user.id, body.endpoint)

    return context.body(null, 204)
  })

  /** Marks one entry read. */
  router.post('/:id/read', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await deps.notifications.markRead(session.user.id, id)

    return context.body(null, 204)
  })

  return router
}
