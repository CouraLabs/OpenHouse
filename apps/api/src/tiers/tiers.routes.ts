import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'

export function tiersRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.get('/current', async (context) =>
    context.json(
      await context.var.business.tiers.status(context.get('session').tenant.id)
    )
  )

  return router
}
