import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import type { BillSource } from '../common/upcoming/upcoming-sources.js'
import type { Config } from '../config/env.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'
import { CreditCardStatementService } from './credit-card-statement.service.js'
import { creditCardStatementRoutes } from './credit-card-statements.routes.js'
import { StatementBillSource } from './statement-bill.source.js'
import { StatementCycleSyncService } from './statement-cycle-sync.service.js'

/** The credit-card-statements feature's wiring: its routes, and the two
 * ports other features consume — the bills the upcoming list still asks
 * for, and the resync a card's day change writes into its own batch. */
export interface CreditCardStatementDeps {
  router: App
  billSource: BillSource
  cycleSync: CardCycleSync
}

/**
 * Builds the feature's services from the request's dependencies — the
 * explicit composition the DI module once did. The services are cheap
 * objects, rebuilt per request from the same handles.
 */
export function creditCardStatementDeps(
  db: Database,
  _config: Config,
  clock: SystemClock
): CreditCardStatementDeps {
  const statements = new CreditCardStatementRepository(
    db,
    new SettingsRepository(db),
    clock
  )
  const service = new CreditCardStatementService(statements)

  return {
    router: creditCardStatementRoutes({ statements: service }),
    billSource: new StatementBillSource(statements),
    cycleSync: new StatementCycleSyncService(statements),
  }
}
