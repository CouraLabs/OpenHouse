import { Hono } from 'hono'
import { updatePreferencesSchema } from '@workspace/dto'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'

export function preferencesRoutes(): App {
  const router: App = new Hono<AppEnv>()

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updatePreferencesSchema)

    return context.json(
      await context.var.business.preferences.update(
        session.tenant.id,
        session.user.id,
        body
      )
    )
  })

  return router
}
