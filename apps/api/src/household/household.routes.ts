import { Hono } from 'hono'

import { householdOverviewSchema } from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { HouseholdService } from './household.service.js'

/**
 * The household routes, open to every signed-in member: the people an
 * expense can be shared with, the balances between them, and the check
 * that runs before a member is removed. Settling up is recorded through
 * the transactions routes, as a transfer. The tenant comes from the
 * session, never the request.
 */
export function householdRoutes(deps: {
  household: HouseholdService
}): App {
  const router: App = new Hono<AppEnv>()

  /** Lists the members, removed ones included. */
  router.get('/members', async (context) => {
    const session = context.get('session')

    return context.json(await deps.household.listMembers(session.tenant.id))
  })

  /** The balance a member still holds, so the removal can warn first. */
  router.get('/members/:id/balance', async (context) => {
    const session = context.get('session')
    const id = Number.parseInt(context.req.param('id'), 10)

    return context.json(
      await deps.household.balanceCheck(session.tenant.id, id)
    )
  })

  /** Balances, settle-up suggestions, spending, and settlement history. */
  router.post('/overview', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, householdOverviewSchema)

    return context.json(
      await deps.household.overview(session.tenant.id, body)
    )
  })

  return router
}
