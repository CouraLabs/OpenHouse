import { Hono } from 'hono'
import { upcomingQuerySchema } from '@workspace/dto'

import type { AppEnv, App } from '../common/context.js'
import { parseQuery } from '../common/validation/parse.js'

export function upcomingRoutes(): {
  router: App
} {
  const router = new Hono<AppEnv>()

  router.get('/', async (context) => {
    const session = context.get('session')
    const query = parseQuery(context, upcomingQuerySchema)

    return context.json(
      await context.var.business.upcoming.build(session.tenant.id, query.days)
    )
  })

  return { router }
}
