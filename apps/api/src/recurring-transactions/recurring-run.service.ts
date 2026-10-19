import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import type { RecurringTransaction } from '@workspace/db'
import { dayIn, todayIn, type Frequency } from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { Clock } from '../common/clock/clock.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'

/** The shape of a rule the due check reads. */
export interface DueRule {
  frequency: Frequency
  frequencyDay: number | null
  frequencyMonth: number | null
}

/**
 * Answers whether a rule is due on a day, as a pure function of the rule
 * and the `YYYY-MM-DD` day — no clock, no database, fully unit-testable.
 *
 * Daily is due every day. Weekly compares the ISO weekday (1–7, Monday is
 * 1). Monthly and Yearly compare the day of the month, clamped: a rule on
 * day 31 runs on the last day of a 30-day month, and a rule on February 29
 * runs on February 28 of a common year.
 */
export function isDueOn(rule: DueRule, day: string): boolean {
  const [year, month, date] = day.split('-').map(Number)
  const at = new Date(Date.UTC(year, month - 1, date))

  if (rule.frequency === 'Daily') {
    return true
  }

  if (rule.frequency === 'Weekly') {
    // JavaScript's Sunday-first weekday becomes the ISO Monday-first one.
    const isoWeekday = ((at.getUTCDay() + 6) % 7) + 1

    return rule.frequencyDay === isoWeekday
  }

  if (rule.frequencyDay === null) {
    return false
  }

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const dueDay = Math.min(rule.frequencyDay, lastDay)

  if (date !== dueDay) {
    return false
  }

  return rule.frequency !== 'Yearly' || rule.frequencyMonth === month
}

/**
 * Shifts a `YYYY-MM-DD` day by a number of days. Pure calendar arithmetic
 * on a UTC midnight — no timezone offset or DST boundary can move it.
 */
export function shiftDay(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number)

  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10)
}

/**
 * The background service that materializes due recurring rules into real
 * transactions. "Today" is each tenant's own: a rule is evaluated against
 * the calendar day of the tenant's time zone, never the server's. The job
 * runs every hour, so every zone's new day is picked up soon after its
 * midnight, and it is idempotent: a
 * rule due on a day whose transaction already exists is skipped, so a
 * restarted process never double-bills — and the partial unique index in
 * the schema makes that claim atomic even between replicas.
 *
 * Each run also looks a few days back: a process down over the cron's
 * minute (a deploy, a crash) catches the missed day up on the next run,
 * and a boot after downtime runs the same window immediately.
 */
@Injectable()
export class RecurringRunService {
  private readonly logger = new Logger(RecurringRunService.name)

  constructor(
    private readonly rules: RecurringTransactionRepository,
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  /** How many days back a run looks for days it missed — the downtime a
   * deploy over the cron's minute, or a weekend outage, recovers from. */
  private static readonly CATCH_UP_DAYS = 7

  /** Materializes every due rule of every tenant; answers how many rows
   * it created. One failing tenant never stops the others. `days` widens
   * the catch-up window — the tests pin it to one day. */
  @Cron('0 30 * * * *')
  async runDue(
    days: number = RecurringRunService.CATCH_UP_DAYS
  ): Promise<number> {
    return this.materializeWindow(days)
  }

  /** A boot is a run too: the process may have been down over the cron's
   * minute. The idempotency check makes re-running the window harmless. */
  onModuleInit(): void {
    void this.runDue().catch((error) => {
      this.logger.error('The recurring catch-up on boot failed.', error)
    })
  }

  /** Materializes every due rule over the last `days` days of its
   * tenant's calendar, oldest first, ending on the tenant's today — the
   * day order keeps an outage's days landing in sequence. Rules do not
   * generate before the day they were created. */
  private async materializeWindow(days: number): Promise<number> {
    const now = this.clock.now()
    const rules = await this.rules.listActiveAllTenants()
    const timezones = await this.settings.timezonesOf([
      ...new Set(rules.map((rule) => rule.tenantId)),
    ])
    const windows = new Map<string, string[]>()
    let created = 0

    for (const rule of rules) {
      // A tenant always has its settings row; UTC only guards a gap.
      const timezone = timezones.get(rule.tenantId) ?? 'UTC'
      let window = windows.get(timezone)
      if (window === undefined) {
        const today = todayIn(timezone, now)
        window = Array.from({ length: days }, (_, index) =>
          shiftDay(today, index - (days - 1))
        )
        windows.set(timezone, window)
      }
      const firstDay = dayIn(rule.createdDt, timezone)

      for (const day of window) {
        if (day < firstDay || !isDueOn(rule, day)) {
          continue
        }

        try {
          created += await this.materialize(rule, day)
        } catch (error) {
          this.logger.error(
            `Recurring rule ${rule.id} of tenant ${rule.tenantId} failed to materialize on ${day}.`,
            error
          )
        }
      }
    }

    if (created > 0) {
      this.logger.log(`Materialized ${created} recurring transactions.`)
    }

    return created
  }

  /** Creates one rule's transaction for one day, unless it already exists.
   * A rule whose account, category, or receiver was deleted is skipped —
   * loudly, every run, until the rule is fixed or deleted: writing money
   * into a deleted account or category would silently corrupt the books. */
  private async materialize(
    rule: RecurringTransaction,
    day: string
  ): Promise<number> {
    const existing = await this.transactions.findByRecurringAndDate(
      rule.tenantId,
      rule.id,
      day
    )

    if (existing !== undefined) {
      return 0
    }

    if (!(await this.assertReferencesUsable(rule))) {
      return 0
    }

    // The rule row carries no display names; the joined read answers them.
    const named = await this.rules.findById(rule.tenantId, rule.id)

    const inserted = await this.transactions.insertGenerated(rule.tenantId, {
      name: named === undefined ? `Recurring #${rule.id}` : named.receiverName,
      note: null,
      invoice: 'RECURRING',
      amount: rule.amount,
      transactionDt: day,
      linkedAccountId: rule.linkedAccountId,
      categoryId: rule.categoryId,
      receiverId: rule.receiverId,
      recurringId: rule.id,
      // The rule carries its own type: a salary rule generates an Income,
      // a bill rule an Expense.
      type: rule.type,
      reviewStatus: 'Verify',
      statusNote: null,
    })

    // `undefined` means another replica won the insert race — the day is
    // materialized all the same, just not by this process.
    return inserted === undefined ? 0 : 1
  }

  /** Answers whether the rule's references are all still rows the tenant
   * can use; logs the broken ones so they get noticed. */
  private async assertReferencesUsable(
    rule: RecurringTransaction
  ): Promise<boolean> {
    const [account, category] = await Promise.all([
      this.accounts.findById(rule.tenantId, rule.linkedAccountId),
      this.categories.findById(rule.tenantId, rule.categoryId),
    ])

    if (
      account === undefined ||
      account.status === 'DELETED' ||
      category === undefined ||
      category.status === 'DELETED'
    ) {
      this.logger.error(
        `Recurring rule ${rule.id} of tenant ${rule.tenantId} points at a deleted account or category; skipping until the rule is fixed.`
      )

      return false
    }

    if (rule.receiverId !== null) {
      const receiver = await this.receivers.findById(
        rule.tenantId,
        rule.receiverId
      )

      if (receiver === undefined || receiver.status === 'DELETED') {
        this.logger.error(
          `Recurring rule ${rule.id} of tenant ${rule.tenantId} points at a deleted receiver; skipping until the rule is fixed.`
        )

        return false
      }
    }

    return true
  }
}
