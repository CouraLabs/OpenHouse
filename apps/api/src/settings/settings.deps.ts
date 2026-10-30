import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { SettingsRepository } from './settings.repository.js'
import { SettingsService } from './settings.service.js'
import { settingsRoutes } from './settings.routes.js'

export interface SettingsDeps {
  router: App
}

export function settingsDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): SettingsDeps {
  return {
    router: settingsRoutes({
      settings: new SettingsService(new SettingsRepository(db)),
    }),
  }
}
