import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { PreferencesRepository } from './preferences.repository.js'
import { PreferencesService } from './preferences.service.js'
import { preferencesRoutes } from './preferences.routes.js'

/**
 * The preferences feature's wiring: its routes, mounted under
 * `/api/preferences`.
 */
export interface PreferencesDeps {
  router: App
}

/**
 * Builds the preferences feature's services from the request's dependencies —
 * the explicit composition the DI container once did.
 */
export function preferencesDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): PreferencesDeps {
  return {
    router: preferencesRoutes({
      preferences: new PreferencesService(new PreferencesRepository(db)),
    }),
  }
}
