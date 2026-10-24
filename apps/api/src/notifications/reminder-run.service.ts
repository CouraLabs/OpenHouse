import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
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

/**
 * The hourly reminder job. Each tenant is evaluated on its own calendar —
 * "today" is `todayIn(settings.timezone)` and a tenant is skipped until its
 * own morning (`SEND_FROM_HOUR`) — so a household at UTC−03:00 is judged by
 * its local day, not the server's. The job is idempotent: the delivery
 * claims every reminder in the `notification_log` first, so a restart, an
 * overlapping run, or a second replica sends nothing twice. One failing
 * tenant or user never stops the others.
 */
@Injectable()
export class ReminderRunService {
  private readonly logger = new Logger(ReminderRunService.name)

  constructor(
    private readonly preferences: NotificationPreferencesRepository,
    private readonly settings: SettingsRepository,
    private readonly bills: BillSource,
    private readonly recurring: RecurringSource,
    private readonly limits: LimitSource,
    private readonly delivery: ReminderDeliveryService,
    private readonly clock: Clock
  ) {}

  /** The scheduled run, at minute 45: after the recurring job (minute 30)
   * has materialized the hour's transactions. */
  @Cron('0 45 * * * *')
  async runHourly(): Promise<number> {
    return this.run()
  }

  /** Evaluates every tenant now — or only `onlyTenantId`, which the e2e
   * specs use to keep a run off the other tenants of a shared database —
   * and answers how many messages went out. */
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
        sent += await this.runTenant(
          tenantId,
          recipients,
          todayIn(timezone, now)
        )
      } catch (error) {
        this.logger.error(`Reminders of tenant ${tenantId} failed.`, error)
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} reminders.`)
    }

    return sent
  }

  /** Reads the tenant's four sources once and delivers what each of its
   * users is due. */
  private async runTenant(
    tenantId: number,
    recipients: readonly Recipient[],
    today: string
  ): Promise<number> {
    const [bills, rules, generatedToday, limits] = await Promise.all([
      this.bills.pendingBills(tenantId, shiftDay(today, MAX_LEAD_DAYS)),
      this.recurring.activeRules(tenantId),
      this.recurring.generatedOn(tenantId, today),
      this.limits.usage(tenantId),
    ])
    let sent = 0

    for (const recipient of recipients) {
      try {
        sent += await this.delivery.deliver(
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
        this.logger.error(
          `Reminders of user ${recipient.userId} (tenant ${tenantId}) failed.`,
          error
        )
      }
    }

    return sent
  }
}
