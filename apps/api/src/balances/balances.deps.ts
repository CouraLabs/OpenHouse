import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { BalanceRepository } from './balance.repository.js'
import { BalanceService } from './balance.service.js'
import { balancesRoutes } from './balances.routes.js'

export interface BalancesDeps {
  router: App
}

export function balancesDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): BalancesDeps {
  const balances = new BalanceService(new BalanceRepository(db))

  return { router: balancesRoutes({ balances }) }
}
