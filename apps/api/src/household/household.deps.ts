import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { HouseholdRepository } from './household.repository.js'
import { HouseholdService } from './household.service.js'
import { householdRoutes } from './household.routes.js'

export interface HouseholdDeps {
  router: App
  members: HouseholdMembers
}

export function householdDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): HouseholdDeps {
  const repository = new HouseholdRepository(db)
  const household = new HouseholdService(repository, new SettingsRepository(db))

  return {
    router: householdRoutes({ household }),
    members: repository,
  }
}
