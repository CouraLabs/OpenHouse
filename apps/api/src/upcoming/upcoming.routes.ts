import { Hono } from 'hono'
import { upcomingQuerySchema } from '@workspace/poco'

import type { AppEnv, App } from '../common/context.js'
import { parseQuery } from '../common/validation/parse.js'
import type { UpcomingService } from './upcoming.service.js'

/** The Upcoming panel's route. The tenant comes from the session. */
export function upcomingRoutes(deps: {
  upcoming: UpcomingService
}): { router: App } {
  const router = new Hono<AppEnv>()

  /** What is coming due in the next `days` days, with projected balances. */
  router.get('/', async (context) => {
    const session = context.get('session')
    const query = parseQuery(context, upcomingQuerySchema)

    return context.json(await deps.upcoming.build(session.tenant.id, query.days))
  })

  return { router }
}
