import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import { NotFoundError } from '../common/errors.js'
import type { CalendarService } from './calendar.service.js'

/**
 * The calendar feed. Managing it (`feed`) needs a session and acts on the
 * session's user; fetching the `.ics` is public — a calendar app has no
 * cookies — and authorized by the secret token in its path alone, so it
 * rides the public router and the integrator mounts it outside the
 * authenticated group.
 */
export function calendarRoutes(deps: {
  calendar: CalendarService
}): { publicRouter: App; protectedRouter: App } {
  const publicRouter: App = new Hono<AppEnv>()
  const protectedRouter: App = new Hono<AppEnv>()

  // --- The signed-in routes ---

  /** The user's feed path, or null while none exists. */
  protectedRouter.get('/feed', async (context) => {
    const session = context.get('session')

    return context.json(await deps.calendar.find(session.user.id))
  })

  /** Creates the feed or rotates its token. */
  protectedRouter.post('/feed', async (context) => {
    const session = context.get('session')

    return context.json(
      await deps.calendar.rotate(session.tenant.id, session.user.id),
      201
    )
  })

  /** Deletes the feed; its URL stops working. */
  protectedRouter.delete('/feed', async (context) => {
    const session = context.get('session')

    await deps.calendar.remove(session.user.id)

    return context.body(null, 204)
  })

  // --- The public route (mounted before the auth middleware) ---

  /** The `.ics` itself, fetched by a calendar app. */
  publicRouter.get('/:file', async (context) => {
    const file = context.req.param('file')

    if (!file.endsWith('.ics')) {
      throw new NotFoundError('No such calendar.')
    }

    const ics = await deps.calendar.render(file.slice(0, -'.ics'.length))

    context.header('Content-Type', 'text/calendar; charset=utf-8')
    context.header('Cache-Control', 'private, max-age=300')
    context.header('X-Robots-Tag', 'noindex')

    return context.body(ics)
  })

  return { publicRouter, protectedRouter }
}
