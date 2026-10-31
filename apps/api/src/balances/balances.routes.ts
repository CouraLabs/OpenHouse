import { Hono } from 'hono'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import { balanceHistorySchema } from '@workspace/dto'

export function balancesRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.get('/consistency', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.balances.check(session.tenant.id)
    )
  })

  router.post('/:accountId/history', async (context) => {
    const session = context.get('session')
    const accountId = Number.parseInt(context.req.param('accountId'), 10)
    const body = await parseJsonBody(context, balanceHistorySchema)

    return context.json(
      await context.var.business.balances.history(
        session.tenant.id,
        accountId,
        body
      )
    )
  })

  return router
}
