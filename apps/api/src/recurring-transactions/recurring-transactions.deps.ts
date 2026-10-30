import type { Database } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { HouseholdRepository } from '../household/household.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'
import { RecurringTransactionService } from './recurring-transaction.service.js'
import { recurringTransactionRoutes } from './recurring-transactions.routes.js'

export interface RecurringTransactionsDeps {
  router: App
}

export function recurringTransactionsDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): RecurringTransactionsDeps {
  const recurring = new RecurringTransactionService(
    new RecurringTransactionRepository(db),
    new ReceiverRepository(db),
    new CategoryRepository(db),
    new AccountRepository(db),
    new HouseholdRepository(db)
  )

  return recurringTransactionRoutes({
    recurring,
    audit: new AuditLogService(new AuditLogRepository(db)),
  })
}
