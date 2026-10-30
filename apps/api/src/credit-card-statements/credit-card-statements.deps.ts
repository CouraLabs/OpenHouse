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

export interface CreditCardStatementDeps {
  router: App
  billSource: BillSource
  cycleSync: CardCycleSync
}

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
