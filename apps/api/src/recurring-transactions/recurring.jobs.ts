import type { Database } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { BalanceRepository } from '../balances/balance.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import { HouseholdRepository } from '../household/household.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'
import { RecurringRunService } from './recurring-run.service.js'

/**
 * The recurring materialization for one tenant — the queue job the cron
 * fans out to (one `recurring` message per tenant). It materializes every
 * due rule of the tenant over the last 7 days of the tenant's own
 * calendar, ending on its today, and answers how many rows it created.
 *
 * Idempotent: a day already materialized inserts nothing (the pre-check
 * skips it, and the partial unique index on
 * `(tenant_id, recurring_id, transaction_dt)` makes a lost race answer
 * `undefined`), so a redelivered message redoes nothing.
 */
export async function runRecurringForTenant(
  db: Database,
  clock: SystemClock,
  tenantId: number
): Promise<number> {
  const settings = new SettingsRepository(db)
  const statements = new CreditCardStatementRepository(db, settings, clock)
  const run = new RecurringRunService(
    new RecurringTransactionRepository(db),
    new TransactionRepository(db, statements, new BalanceRepository(db)),
    new AccountRepository(db),
    new CategoryRepository(db),
    new ReceiverRepository(db),
    settings,
    clock,
    // The household repository is the implementation of the
    // `HouseholdMembers` port the payer fallback resolves through.
    new HouseholdRepository(db)
  )

  return run.runForTenant(tenantId)
}
