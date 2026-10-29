import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { BalanceRepository } from './balance.repository.js'
import { BalanceService } from './balance.service.js'
import { balancesRoutes } from './balances.routes.js'

/** The balances feature's wiring: its routes. */
export interface BalancesDeps {
  router: App
}

/**
 * Builds the feature's services from the request's dependencies — the
 * explicit composition the DI module once did. The services are cheap
 * objects, rebuilt per request from the same handles.
 */
export function balancesDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): BalancesDeps {
  const balances = new BalanceService(new BalanceRepository(db))

  return { router: balancesRoutes({ balances }) }
}
