import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import { NotFoundError } from '@workspace/business'

export function calendarRoutes(): {
  publicRouter: App
  protectedRouter: App
} {
  const publicRouter: App = new Hono<AppEnv>()
  const protectedRouter: App = new Hono<AppEnv>()

  protectedRouter.get('/feed', async (context) => {
    const session = context.get('session')

    return context.json(await context.var.business.calendar.find(session.user.id))
  })

  protectedRouter.post('/feed', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.calendar.rotate(session.tenant.id, session.user.id),
      201
    )
  })

  protectedRouter.delete('/feed', async (context) => {
    const session = context.get('session')

    await context.var.business.calendar.remove(session.user.id)

    return context.body(null, 204)
  })

  publicRouter.get('/:file', async (context) => {
    const file = context.req.param('file')

    if (!file.endsWith('.ics')) {
      throw new NotFoundError('No such calendar.')
    }

    const ics = await context.var.business.calendar.render(file.slice(0, -'.ics'.length))

    context.header('Content-Type', 'text/calendar; charset=utf-8')
    context.header('Cache-Control', 'private, max-age=300')
    context.header('X-Robots-Tag', 'noindex')

    return context.body(ics)
  })

  return { publicRouter, protectedRouter }
}
