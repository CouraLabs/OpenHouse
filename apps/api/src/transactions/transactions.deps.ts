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
import { tierGateFor } from '../tiers/tiers.deps.js'

export interface TransactionsDeps {
  router: App
  reconciliationRouter: App
}

export function transactionsDeps(
  db: Database,
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
    members,
    tierGateFor(db, clock)
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
