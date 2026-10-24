import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import type { RecurringTransaction } from '@workspace/db'
import {
  dayIn,
  isDueOn,
  parseSplit,
  resolveSplit,
  shiftDay,
  todayIn,
} from '@workspace/poco'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { Clock } from '../common/clock/clock.js'
import { HouseholdMembers } from '../common/household/household-members.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'

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
export class RecurringRunService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecurringRunService.name)

  /** The boot catch-up, kept so shutdown can wait for it to finish. */
  private bootRun: Promise<void> | undefined

  constructor(
    private readonly rules: RecurringTransactionRepository,
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
    private readonly receivers: ReceiverRepository,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock,
    private readonly members: HouseholdMembers
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
    this.bootRun = this.runDue().then(
      () => undefined,
      (error: unknown) => {
        this.logger.error('The recurring catch-up on boot failed.', error)
      }
    )
  }

  /** Shutdown waits for the boot catch-up, so it never queries a pool the
   * database module has already closed. Nest destroys this service before
   * the module that owns the pool. */
  async onModuleDestroy(): Promise<void> {
    await this.bootRun
  }

  /** The member a rule's expenses are paid by. A removed member can no longer
   * pay, so a rule still naming one is paid by the tenant's owner from then on. */
  private async payerOf(rule: RecurringTransaction): Promise<number | null> {
    if (rule.paidByUserId === null) {
      return null
    }

    const active = await this.members.activeMemberIds(rule.tenantId)

    if (active.includes(rule.paidByUserId)) {
      return rule.paidByUserId
    }

    const owner = await this.members.ownerId(rule.tenantId)
    this.logger.warn(
      `Recurring rule ${rule.id} of tenant ${rule.tenantId} names a removed member as payer; its expenses are paid by the owner.`
    )

    return owner ?? rule.paidByUserId
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

    const paidByUserId = await this.payerOf(rule)

    // The rule's default shares are copied onto the transaction it makes
    // (an income, or an account that turned shared, carries none).
    const split = parseSplit(rule.defaultSplit)
    const shares =
      split === null || rule.type !== 'Expense'
        ? undefined
        : resolveSplit(rule.amount, split, paidByUserId)
    const account = await this.accounts.findById(
      rule.tenantId,
      rule.linkedAccountId
    )

    // A default split that no longer resolves must not quietly become an
    // unsplit expense: skip and say why, as for a deleted account.
    if (shares?.ok === false && account?.ownership !== 'shared') {
      this.logger.error(
        `Recurring rule ${rule.id} of tenant ${rule.tenantId} has a default split that no longer resolves (${shares.message}); skipping until the rule is fixed.`
      )

      return 0
    }

    const inserted = await this.transactions.insertGenerated(rule.tenantId, {
      paidByUserId,
      ...(shares?.ok === true && account?.ownership !== 'shared'
        ? { splits: shares.shares }
        : {}),
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
