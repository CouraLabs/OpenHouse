import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import type { TierGateService } from './tier-gate.service.js'

export function tiersRoutes(deps: { tiers: TierGateService }): App {
  const router: App = new Hono<AppEnv>()

  router.get('/current', async (context) =>
    context.json(await deps.tiers.status(context.get('session').tenant.id))
  )

  return router
}
