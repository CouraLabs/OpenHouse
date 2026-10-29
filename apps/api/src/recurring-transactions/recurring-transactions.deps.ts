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

/** The recurring transactions feature's wiring: the rule routes, mounted
 * under `/api/recurring-transactions`, behind the rule service. */
export interface RecurringTransactionsDeps {
  router: App
}

/**
 * Builds the recurring transactions feature's services from the request's
 * dependencies — the explicit composition the DI container once did. The
 * services and repositories are cheap objects, rebuilt per request from
 * the same handles. The materialization job does not ride the request: the
 * queue consumer builds it through `runRecurringForTenant`.
 */
export function recurringTransactionsDeps(
  db: Database,
  /** Unused today — kept in the signature every deps builder shares, so a
   * rule that needs a secret or a ttl plugs in without a rewrite. */
  _config: Config,
  _clock: SystemClock
): RecurringTransactionsDeps {
  const recurring = new RecurringTransactionService(
    new RecurringTransactionRepository(db),
    new ReceiverRepository(db),
    new CategoryRepository(db),
    new AccountRepository(db),
    // The household repository is the implementation of the
    // `HouseholdMembers` port the split rules validate through.
    new HouseholdRepository(db)
  )

  return recurringTransactionRoutes({
    recurring,
    audit: new AuditLogService(new AuditLogRepository(db)),
  })
}
