import { Hono } from 'hono'

import {
  notificationPreferencesSchema,
  pushSubscriptionSchema,
  pushUnsubscribeSchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function notificationsRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.get('/', async (context) => {
    const session = context.get('session')

    return context.json(await context.var.business.notifications.list(session.user.id))
  })

  router.post('/read-all', async (context) => {
    const session = context.get('session')

    await context.var.business.notifications.markAllRead(session.user.id)

    return context.body(null, 204)
  })

  router.get('/preferences', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.notifications.getPreferences(
        session.tenant.id,
        session.user.id
      )
    )
  })

  router.put('/preferences', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, notificationPreferencesSchema)

    return context.json(
      await context.var.business.notifications.savePreferences(
        session.tenant.id,
        session.user.id,
        body
      )
    )
  })

  router.get('/push-config', (context) => context.json(context.var.business.push.config()))

  router.post('/push-subscriptions', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, pushSubscriptionSchema)

    await context.var.business.push.subscribe(
      session.tenant.id,
      session.user.id,
      body,
      context.req.header('user-agent')?.slice(0, 255) ?? null
    )

    return context.body(null, 204)
  })

  router.delete('/push-subscriptions', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, pushUnsubscribeSchema)

    await context.var.business.push.unsubscribe(session.user.id, body.endpoint)

    return context.body(null, 204)
  })

  router.post('/:id/read', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    await context.var.business.notifications.markRead(session.user.id, id)

    return context.body(null, 204)
  })

  return router
}
