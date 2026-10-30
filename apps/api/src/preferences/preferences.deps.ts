import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { PreferencesRepository } from './preferences.repository.js'
import { PreferencesService } from './preferences.service.js'
import { preferencesRoutes } from './preferences.routes.js'

export interface PreferencesDeps {
  router: App
}

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
