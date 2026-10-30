import type { Database } from '@workspace/db'

import { AuditLogService } from '../audit/audit-log.service.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { StatementCycleSyncService } from '../credit-card-statements/statement-cycle-sync.service.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { AccountRepository } from './account.repository.js'
import { accountRoutes } from './account.routes.js'
import { AccountService } from './account.service.js'

export interface AccountDeps {
  router: App
}

export function accountDeps(
  db: Database,
  _config: Config,
  clock: SystemClock
): AccountDeps {
  const settings = new SettingsRepository(db)
  const statements = new CreditCardStatementRepository(db, settings, clock)

  const accounts = new AccountService(
    new AccountRepository(db),
    new StatementCycleSyncService(statements),
    statements
  )

  return {
    router: accountRoutes({
      accounts,
      audit: new AuditLogService(new AuditLogRepository(db)),
    }),
  }
}
