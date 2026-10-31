import {
  BalanceRepository,
  CreditCardStatementRepository,
  type Database,
  SettingsRepository,
  TransactionRepository,
} from '@workspace/db'

import { StatementBills } from '../credit-card-statements/statement-bills.js'
import { StatementPlacer } from '../credit-card-statements/statement-placer.js'
import type { Clock } from '../ports/clock.js'
import { TenantToday } from '../settings/tenant-today.js'
import { TransactionPlanner } from './transaction-planner.js'
import { TransactionWrites } from './transaction-writes.js'

export function ledgerFor(db: Database, clock: Clock) {
  const settings = new SettingsRepository(db)
  const today = new TenantToday(settings, clock)
  const balances = new BalanceRepository(db)
  const statements = new CreditCardStatementRepository(db, clock)
  const transactions = new TransactionRepository(db, statements, balances)
  const placer = new StatementPlacer(statements, today)
  const planner = new TransactionPlanner(transactions, placer)
  const writes = new TransactionWrites(transactions, planner, statements, today)
  const bills = new StatementBills(statements, placer, today)

  return {
    settings,
    today,
    balances,
    statements,
    transactions,
    placer,
    planner,
    writes,
    bills,
  }
}
