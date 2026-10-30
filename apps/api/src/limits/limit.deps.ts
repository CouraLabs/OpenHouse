import type { Database } from '@workspace/db'

import { AuditLogService } from '../audit/audit-log.service.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { BalanceRepository } from '../balances/balance.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { limitRoutes } from './limit.routes.js'
import { LimitRepository } from './limit.repository.js'
import { LimitService } from './limit.service.js'
import { LimitUsageSource } from './limit-usage.source.js'

export interface LimitDeps {
  router: App
  usageSource: LimitUsageSource
}

export function limitDeps(
  db: Database,
  _config: Config,
  clock: SystemClock
): LimitDeps {
  const settings = new SettingsRepository(db)
  const limits = new LimitService(
    new LimitRepository(db),
    new CategoryRepository(db),
    new TransactionRepository(
      db,
      new CreditCardStatementRepository(db, settings, clock),
      new BalanceRepository(db)
    ),
    settings,
    clock
  )

  return {
    router: limitRoutes({
      limits,
      audit: new AuditLogService(new AuditLogRepository(db)),
    }),
    usageSource: new LimitUsageSource(limits),
  }
}
