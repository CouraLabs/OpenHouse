import { Hono } from 'hono'
import { scheduleTenantDeletionSchema } from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function tenantDeletionRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.post('/', requireRole(['owner']), async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, scheduleTenantDeletionSchema)

    return context.json(
      await context.var.business.tenantDeletion.schedule(
        session.tenant.id,
        session.user.id,
        body.tenantName
      ),
      201
    )
  })

  router.delete('/', requireRole(['owner']), async (context) => {
    const session = context.get('session')

    await context.var.business.tenantDeletion.cancel(
      session.tenant.id,
      session.user.id
    )

    return context.body(null, 204)
  })

  return router
}
