import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import { balanceHistorySchema } from '@workspace/poco'
import type { BalanceService } from './balance.service.js'

/**
 * The balance routes. The tenant comes from the session, never the request.
 */
export function balancesRoutes(deps: { balances: BalanceService }): App {
  const router: App = new Hono<AppEnv>()

  /** Checks the tenant's cached balances against their ledgers and answers
   * the accounts that drifted. */
  router.get('/consistency', async (context) => {
    const session = context.get('session')

    return context.json(await deps.balances.check(session.tenant.id))
  })

  /** One end-of-day balance per day of the range, for one account. */
  router.post('/:accountId/history', async (context) => {
    const session = context.get('session')
    const accountId = Number.parseInt(context.req.param('accountId'), 10)
    const body = await parseJsonBody(context, balanceHistorySchema)

    return context.json(
      await deps.balances.history(session.tenant.id, accountId, body)
    )
  })

  return router
}
