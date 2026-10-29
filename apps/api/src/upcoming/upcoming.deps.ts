import type { Database } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { BalanceRepository } from '../balances/balance.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { StatementBillSource } from '../credit-card-statements/statement-bill.source.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { GoalRepository } from '../goals/goal.repository.js'
import { GoalProgressSource } from '../goals/goal-progress.source.js'
import { LimitRepository } from '../limits/limit.repository.js'
import { LimitService } from '../limits/limit.service.js'
import { LimitUsageSource } from '../limits/limit-usage.source.js'
import { RecurringTransactionRepository } from '../recurring-transactions/recurring-transaction.repository.js'
import { RecurringRuleSource } from '../recurring-transactions/recurring-rule.source.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { upcomingRoutes } from './upcoming.routes.js'
import { UpcomingService } from './upcoming.service.js'

/** The upcoming feature's wiring: the panel's route, mounted under
 * `/api/upcoming`, behind the service that assembles the four sources. */
export interface UpcomingDeps {
  router: App
}

/**
 * Builds the upcoming feature's services from the request's dependencies —
 * the explicit composition the DI container once did. The four sources'
 * implementations come from the features that own them (card bills,
 * recurring rules, limits, goals); the service reads them only through the
 * ports.
 */
export function upcomingDeps(
  db: Database,
  /** Unused today — kept in the signature every deps builder shares, so a
   * rule that needs a secret or a ttl plugs in without a rewrite. */
  _config: Config,
  clock: SystemClock
): UpcomingDeps {
  const settings = new SettingsRepository(db)
  const transactions = new TransactionRepository(
    db,
    new CreditCardStatementRepository(db, settings, clock),
    new BalanceRepository(db)
  )

  const upcoming = new UpcomingService(
    new StatementBillSource(
      new CreditCardStatementRepository(db, settings, clock)
    ),
    new RecurringRuleSource(new RecurringTransactionRepository(db), transactions),
    new LimitUsageSource(
      new LimitService(
        new LimitRepository(db),
        new CategoryRepository(db),
        transactions,
        settings,
        clock
      )
    ),
    new GoalProgressSource(new GoalRepository(db), settings),
    new AccountRepository(db),
    settings,
    clock
  )

  return upcomingRoutes({ upcoming })
}
