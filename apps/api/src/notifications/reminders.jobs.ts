import type { Database } from '@workspace/db'
import { hourIn, todayIn } from '@workspace/poco'

import { BalanceRepository } from '../balances/balance.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { StatementBillSource } from '../credit-card-statements/statement-bill.source.js'
import type { Config } from '../config/env.js'
import { LimitRepository } from '../limits/limit.repository.js'
import { LimitService } from '../limits/limit.service.js'
import { LimitUsageSource } from '../limits/limit-usage.source.js'
import { RecurringTransactionRepository } from '../recurring-transactions/recurring-transaction.repository.js'
import { RecurringRuleSource } from '../recurring-transactions/recurring-rule.source.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { NotificationLogRepository } from './notification-log.repository.js'
import {
  NotificationPreferencesRepository,
} from './notification-preferences.repository.js'
import { NotificationRepository } from './notification.repository.js'
import { PushService } from './push.service.js'
import { PushSubscriptionRepository } from './push-subscription.repository.js'
import { WebPushTransport } from './push-transport.js'
import { ReminderDeliveryService } from './reminder-delivery.service.js'
import { runTenantReminders, type ReminderSources } from './reminder-run.service.js'
import { SEND_FROM_HOUR } from './reminder-rules.js'

/**
 * One tenant's reminder evaluation for the queue consumer. The tenant's
 * own time zone decides what day it is and whether the send window
 * (`SEND_FROM_HOUR`) has opened; the evaluation is idempotent — the
 * delivery claims every reminder in the `notification_log` first, so a
 * redelivered message sends nothing twice. The `PushService` pushes only
 * when the VAPID pair is configured (`config.push`); without it the
 * in-app centre still receives everything.
 *
 * Answers how many messages went out.
 */
export async function runRemindersForTenant(
  db: Database,
  config: Config,
  clock: SystemClock,
  tenantId: number
): Promise<number> {
  const settings = new SettingsRepository(db)
  const timezone = (await settings.timezonesOf([tenantId])).get(tenantId) ?? 'UTC'
  const now = clock.now()

  if (hourIn(now, timezone) < SEND_FROM_HOUR) {
    return 0
  }

  const preferences = new NotificationPreferencesRepository(db)
  const statements = new CreditCardStatementRepository(db, settings, clock)
  const transactions = new TransactionRepository(
    db,
    statements,
    new BalanceRepository(db)
  )
  const sources: ReminderSources = {
    bills: new StatementBillSource(statements),
    recurring: new RecurringRuleSource(
      new RecurringTransactionRepository(db),
      transactions
    ),
    limits: new LimitUsageSource(
      new LimitService(
        new LimitRepository(db),
        new CategoryRepository(db),
        transactions,
        settings,
        clock
      )
    ),
    delivery: new ReminderDeliveryService(
      new NotificationLogRepository(db),
      new NotificationRepository(db),
      new PushService(
        new PushSubscriptionRepository(db),
        new WebPushTransport(config.push)
      )
    ),
  }

  return runTenantReminders(
    sources,
    tenantId,
    await preferences.listRecipientsOfTenant(tenantId),
    todayIn(timezone, now)
  )
}
