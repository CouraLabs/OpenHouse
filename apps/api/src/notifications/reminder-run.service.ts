import { hourIn, MAX_LEAD_DAYS, shiftDay, todayIn } from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import {
  BillSource,
  LimitSource,
  RecurringSource,
} from '../common/upcoming/upcoming-sources.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import {
  NotificationPreferencesRepository,
  type Recipient,
} from './notification-preferences.repository.js'
import { ReminderDeliveryService } from './reminder-delivery.service.js'
import { dueReminders, SEND_FROM_HOUR } from './reminder-rules.js'

/** The four sources one tenant's evaluation reads, once each. */
export interface ReminderSources {
  bills: BillSource
  recurring: RecurringSource
  limits: LimitSource
  delivery: ReminderDeliveryService
}

/**
 * Reads the tenant's four sources once and delivers what each of its users
 * is due, on the tenant's calendar day. One failing user never stops the
 * others.
 */
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

/**
 * The reminder evaluation. Each tenant is judged on its own calendar —
 * "today" is `todayIn(settings.timezone)` and a tenant is skipped until its
 * own morning (`SEND_FROM_HOUR`) — so a household at UTC−03:00 is judged by
 * its local day, not the server's. The evaluation is idempotent: the
 * delivery claims every reminder in the `notification_log` first, so a
 * restart, an overlapping run, or a second replica sends nothing twice.
 */
export class ReminderRunService {
  constructor(
    private readonly preferences: NotificationPreferencesRepository,
    private readonly settings: SettingsRepository,
    private readonly sources: ReminderSources,
    private readonly clock: Clock
  ) {}

  /** Evaluates every tenant now — or only `onlyTenantId`, which the specs
   * use to keep a run off the other tenants of a shared database — and
   * answers how many messages went out. */
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
