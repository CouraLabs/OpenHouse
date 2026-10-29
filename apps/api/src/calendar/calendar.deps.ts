import type { Database } from '@workspace/db'

import { BalanceRepository } from '../balances/balance.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { StatementBillSource } from '../credit-card-statements/statement-bill.source.js'
import type { Config } from '../config/env.js'
import { RecurringTransactionRepository } from '../recurring-transactions/recurring-transaction.repository.js'
import { RecurringRuleSource } from '../recurring-transactions/recurring-rule.source.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { CalendarFeedRepository } from './calendar-feed.repository.js'
import { CalendarService } from './calendar.service.js'
import { calendarRoutes } from './calendar.routes.js'

/** The calendar feature's wiring: its routes — the feed's management under
 * a session, and the public `.ics` fetch the token authorizes. */
export interface CalendarDeps {
  /** The `.ics` itself: mounted outside the authenticated group. */
  publicRouter: App
  /** Creating, rotating, and deleting the user's feed. */
  protectedRouter: App
}

/**
 * Builds the calendar feature's services from the request's dependencies —
 * the explicit composition the DI module once did. The feed reads the
 * tenant's bills and recurring rules through the same two ports the
 * upcoming list uses.
 */
export function calendarDeps(
  db: Database,
  _config: Config,
  clock: SystemClock
): CalendarDeps {
  const settings = new SettingsRepository(db)
  const statements = new CreditCardStatementRepository(db, settings, clock)
  const transactions = new TransactionRepository(
    db,
    statements,
    new BalanceRepository(db)
  )
  const calendar = new CalendarService(
    new CalendarFeedRepository(db),
    new StatementBillSource(statements),
    new RecurringRuleSource(new RecurringTransactionRepository(db), transactions),
    settings,
    clock
  )

  return calendarRoutes({ calendar })
}
