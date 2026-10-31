import type {
  NotificationPreferencesRepository,
  Recipient,
  SettingsRepository,
} from '@workspace/db'
import { MAX_LEAD_DAYS } from '@workspace/dto'

import { shiftDay } from '../calc/recurrence.js'
import { hourIn, todayIn } from '../settings/settings.js'
import { Clock } from '../ports/clock.js'
import {
  BillSource,
  LimitSource,
  RecurringSource,
} from '../ports/upcoming-sources.js'
import { ReminderDeliveryService } from './reminder-delivery.service.js'
import { dueReminders, SEND_FROM_HOUR } from './reminder-rules.js'

export interface ReminderSources {
  bills: BillSource
  recurring: RecurringSource
  limits: LimitSource
  delivery: ReminderDeliveryService
}

export async function runTenantReminders(
  sources: ReminderSources,
  tenantId: number,
  recipients: readonly Recipient[],
  today: string
): Promise<number> {
  const [bills, rules, generatedToday, limits] = await Promise.all([
    sources.bills.pendingBills(tenantId, shiftDay(today, MAX_LEAD_DAYS)),
    sources.recurring.activeRules(tenantId),
    sources.recurring.generatedOn(tenantId, today),
    sources.limits.usage(tenantId),
  ])
  let sent = 0

  for (const recipient of recipients) {
    try {
      sent += await sources.delivery.deliver(
        recipient,
        dueReminders({
          today,
          preferences: recipient.preferences,
          bills,
          rules,
          generatedToday,
          limits,
        }),
        today
      )
    } catch (error) {
      console.error(
        `Reminders of user ${recipient.userId} (tenant ${tenantId}) failed.`,
        error
      )
    }
  }

  return sent
}

export class ReminderRunService {
  constructor(
    private readonly preferences: NotificationPreferencesRepository,
    private readonly settings: SettingsRepository,
    private readonly sources: ReminderSources,
    private readonly clock: Clock
  ) {}

  async run(onlyTenantId?: number): Promise<number> {
    const now = this.clock.now()
    const byTenant = new Map<number, Recipient[]>()

    for (const recipient of await this.preferences.listRecipients()) {
      if (onlyTenantId !== undefined && recipient.tenantId !== onlyTenantId) {
        continue
      }

      byTenant.set(recipient.tenantId, [
        ...(byTenant.get(recipient.tenantId) ?? []),
        recipient,
      ])
    }

    const timezones = await this.settings.timezonesOf([...byTenant.keys()])
    let sent = 0

    for (const [tenantId, recipients] of byTenant) {
      const timezone = timezones.get(tenantId) ?? 'UTC'

      if (hourIn(now, timezone) < SEND_FROM_HOUR) {
        continue
      }

      try {
        sent += await runTenantReminders(
          this.sources,
          tenantId,
          recipients,
          todayIn(timezone, now)
        )
      } catch (error) {
        console.error(`Reminders of tenant ${tenantId} failed.`, error)
      }
    }

    if (sent > 0) {
      console.log(`Sent ${sent} reminders.`)
    }

    return sent
  }
}
