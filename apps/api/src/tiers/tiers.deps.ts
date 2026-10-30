import type { Database } from '@workspace/db'

import type { Clock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { TierGate } from '../common/tiers/tier-gate.js'
import type { Config } from '../config/env.js'
import { TierGateService } from './tier-gate.service.js'
import { TierRepository } from './tier.repository.js'
import { tiersRoutes } from './tiers.routes.js'

export interface TiersDeps {
  router: App
  gate: TierGate
}

export function tierGateFor(db: Database, clock: Clock): TierGateService {
  return new TierGateService(new TierRepository(db), clock)
}

export function tiersDeps(
  db: Database,
  _config: Config,
  clock: Clock
): TiersDeps {
  const gate = tierGateFor(db, clock)

  return { router: tiersRoutes({ tiers: gate }), gate }
}
