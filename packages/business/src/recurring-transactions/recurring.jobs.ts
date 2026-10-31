import {
  AccountRepository,
  CategoryRepository,
  type Database,
  HouseholdRepository,
  ReceiverRepository,
  RecurringTransactionRepository,
} from '@workspace/db'

import type { Clock } from '../ports/clock.js'
import { ledgerFor } from '../transactions/ledger-wiring.js'
import { RecurringRunService } from './recurring-run.service.js'

export async function runRecurringForTenant(
  db: Database,
  clock: Clock,
  tenantId: number
): Promise<number> {
  const ledger = ledgerFor(db, clock)
  const run = new RecurringRunService(
    new RecurringTransactionRepository(db),
    ledger.transactions,
    new AccountRepository(db),
    new CategoryRepository(db),
    new ReceiverRepository(db),
    ledger.settings,
    clock,
    new HouseholdRepository(db),
    ledger.writes
  )

  return run.runForTenant(tenantId)
}
