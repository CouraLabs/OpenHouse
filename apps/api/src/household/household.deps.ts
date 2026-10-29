import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { HouseholdRepository } from './household.repository.js'
import { HouseholdService } from './household.service.js'
import { householdRoutes } from './household.routes.js'

/** The household feature's wiring: its routes, and the `HouseholdMembers`
 * port the other features validate payers and splits through. */
export interface HouseholdDeps {
  router: App
  /** The `HouseholdMembers` port: who belongs to the tenant. */
  members: HouseholdMembers
}

/**
 * Builds the household feature's services from the request's dependencies —
 * the explicit composition the DI module once did. The services are cheap
 * objects, rebuilt per request from the same handles.
 */
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
