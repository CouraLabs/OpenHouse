import type { Database } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { BalanceRepository } from '../balances/balance.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { HouseholdRepository } from '../household/household.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { InstallmentRepository } from './installment.repository.js'
import { InstallmentService } from './installment.service.js'
import { ReconciliationService } from './reconciliation.service.js'
import { TransactionRepository } from './transaction.repository.js'
import { TransactionService } from './transaction.service.js'
import { transactionsRoutes } from './transactions.routes.js'

/**
 * The transactions feature's wiring: the ledger's routes (creates, edits,
 * transfers, settle-ups, installs, deletes, the CSV export), the
 * reconciliation routes, and the services behind them.
 */
export interface TransactionsDeps {
  /** Mounted at `/transactions`. */
  router: App
  /** Mounted at `/reconciliation` — the prefix its routes carried. */
  reconciliationRouter: App
}

/**
 * Builds the transactions feature's services from the request's
 * dependencies — the explicit composition the DI module once did. The
 * services and repositories are cheap objects, rebuilt per request from the
 * same handles.
 */
export function transactionsDeps(
  db: Database,
  /** Unused today — kept in the signature every deps builder shares, so a
   * rule that needs a secret or a ttl plugs in without a rewrite. */
  _config: Config,
  clock: SystemClock
): TransactionsDeps {
  const settings = new SettingsRepository(db)
  const statements = new CreditCardStatementRepository(db, settings, clock)
  const balances = new BalanceRepository(db)
  const ledger = new TransactionRepository(db, statements, balances)
  const accounts = new AccountRepository(db)
  const categories = new CategoryRepository(db)
  const receivers = new ReceiverRepository(db)
  // The household repository is the implementation of the `HouseholdMembers`
  // port the split and settle-up rules validate through.
  const members = new HouseholdRepository(db)
  const installments = new InstallmentService(
    new InstallmentRepository(db, ledger),
    ledger,
    accounts,
    categories,
    receivers,
    statements,
    members
  )
  const transactions = new TransactionService(
    ledger,
    accounts,
    categories,
    receivers,
    statements,
    installments,
    members
  )
  const reconciliation = new ReconciliationService(
    ledger,
    accounts,
    categories,
    balances
  )

  const { router, reconciliationRouter } = transactionsRoutes({
    transactions,
    installments,
    reconciliation,
    audit: new AuditLogService(new AuditLogRepository(db)),
  })

  return { router, reconciliationRouter }
}
