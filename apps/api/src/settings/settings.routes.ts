import { Hono } from 'hono'
import { updateSettingsSchema } from '@workspace/poco'

import type { App, AppEnv } from '../common/context.js'
import { requireRole } from '../common/session/auth.middleware.js'
import { parseJsonBody } from '../common/validation/parse.js'
import type { SettingsService } from './settings.service.js'

/**
 * The tenant's global settings. Every signed-in user reads them — members
 * need the time zone and main currency for correct defaults — and only an
 * owner changes them.
 */
export function settingsRoutes(deps: { settings: SettingsService }): App {
  const router: App = new Hono<AppEnv>()

  router.get('/', async (context) => {
    const session = context.get('session')

    return context.json(await deps.settings.get(session.tenant.id))
  })

  router.put(
    '/',
    requireRole(['owner']),
    async (context): Promise<Response> => {
      const session = context.get('session')
      const body = await parseJsonBody(context, updateSettingsSchema)

      return context.json(
        await deps.settings.update(session.tenant.id, session.user.id, body)
      )
    }
  )

  return router
}
