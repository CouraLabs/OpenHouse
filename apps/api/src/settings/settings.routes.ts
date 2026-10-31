import { Hono } from 'hono'
import {
  settingsDefaultsQuerySchema,
  updateSettingsSchema,
} from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody, parseQuery } from '../common/validation/parse.js'

export function settingsRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.get('/defaults', (context) => {
    const query = parseQuery(context, settingsDefaultsQuerySchema)

    return context.json(context.var.business.settings.defaults(query.locale))
  })

  router.get('/', async (context) => {
    const session = context.get('session')

    return context.json(
      await context.var.business.settings.get(session.tenant.id)
    )
  })

  router.put(
    '/',
    requireRole(['owner']),
    async (context): Promise<Response> => {
      const session = context.get('session')
      const body = await parseJsonBody(context, updateSettingsSchema)

      return context.json(
        await context.var.business.settings.update(
          session.tenant.id,
          session.user.id,
          body
        )
      )
    }
  )

  return router
}
