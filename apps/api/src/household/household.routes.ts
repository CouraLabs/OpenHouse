import { Hono } from 'hono'

import { householdOverviewSchema } from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function householdRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.get('/members', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.household.listMembers(session.tenant.id)
    )
  })

  router.get('/members/:id/balance', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(
      await context.var.business.household.balanceCheck(session.tenant.id, id)
    )
  })

  router.post('/overview', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, householdOverviewSchema)

    return context.json(
      await context.var.business.household.overview(session.tenant.id, body)
    )
  })

  return router
}
