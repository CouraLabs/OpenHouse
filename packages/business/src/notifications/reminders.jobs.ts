import {
  CategoryRepository,
  LimitRepository,
  NotificationLogRepository,
  NotificationPreferencesRepository,
  NotificationRepository,
  PushSubscriptionRepository,
  RecurringTransactionRepository,
  SettingsRepository,
  type Database,
} from '@workspace/db'

import { hourIn, todayIn } from '../settings/settings.js'
import { StatementBillSource } from '../credit-card-statements/statement-bill.source.js'
import { LimitUsageSource } from '../limits/limit-usage.source.js'
import { LimitService } from '../limits/limit.service.js'
import type { Clock } from '../ports/clock.js'
import type { PushTransport } from '../ports/push-transport.js'
import { RecurringRuleSource } from '../recurring-transactions/recurring-rule.source.js'
import { ledgerFor } from '../transactions/ledger-wiring.js'
import { PushService } from './push.service.js'
import { ReminderDeliveryService } from './reminder-delivery.service.js'
import { SEND_FROM_HOUR } from './reminder-rules.js'
import {
  runTenantReminders,
  type ReminderSources,
} from './reminder-run.service.js'

export async function runRemindersForTenant(
  db: Database,
  clock: Clock,
  tenantId: number,
  pushTransport: PushTransport
): Promise<number> {
  const settings = new SettingsRepository(db)
  const timezone =
    (await settings.timezonesOf([tenantId])).get(tenantId) ?? 'UTC'
  const now = clock.now()

  if (hourIn(now, timezone) < SEND_FROM_HOUR) {
    return 0
  }

  const preferences = new NotificationPreferencesRepository(db)
  const ledger = ledgerFor(db, clock)
  const transactions = ledger.transactions
  const sources: ReminderSources = {
    bills: new StatementBillSource(ledger.bills),
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
      new PushService(new PushSubscriptionRepository(db), pushTransport)
    ),
  }

  return runTenantReminders(
    sources,
    tenantId,
    await preferences.listRecipientsOfTenant(tenantId),
    todayIn(timezone, now)
  )
}
