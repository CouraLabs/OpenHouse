import { Hono } from 'hono'
import { updatePreferencesSchema } from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { PreferencesService } from './preferences.service.js'

export function preferencesRoutes(deps: {
  preferences: PreferencesService
}): App {
  const router: App = new Hono<AppEnv>()

  router.put('/', async (context) => {
    const session = context.get('session')
    const body = await parseJsonBody(context, updatePreferencesSchema)

    return context.json(
      await deps.preferences.update(session.tenant.id, session.user.id, body)
    )
  })

  return router
}
