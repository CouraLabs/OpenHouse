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

export class RecurringRunService {
  private static readonly CATCH_UP_DAYS = 7

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

  async runForTenant(
    tenantId: number,
    days: number = RecurringRunService.CATCH_UP_DAYS
  ): Promise<number> {
    const now = this.clock.now()
    const rules = await this.rules.listActiveRules(tenantId)
    const timezones = await this.settings.timezonesOf([tenantId])
    const timezone = timezones.get(tenantId) ?? 'UTC'
    const today = todayIn(timezone, now)
    const window = Array.from(
      { length: days },
      (_, index) => shiftDay(today, index - (days - 1))
    )
    let created = 0

    for (const rule of rules) {
      const firstDay = dayIn(rule.createdDt, timezone)

      for (const day of window) {
        if (day < firstDay || !isDueOn(rule, day)) {
          continue
        }

        try {
          created += await this.materialize(rule, day)
        } catch (error) {
          console.error(
            `Recurring rule ${rule.id} of tenant ${rule.tenantId} failed to materialize on ${day}.`,
            error
          )
        }
      }
    }

    if (created > 0) {
      console.log(`Materialized ${created} recurring transactions.`)
    }

    return created
  }

  private async payerOf(rule: RecurringTransaction): Promise<number | null> {
    if (rule.paidByUserId === null) {
      return null
    }

    const active = await this.members.activeMemberIds(rule.tenantId)

    if (active.includes(rule.paidByUserId)) {
      return rule.paidByUserId
    }

    const owner = await this.members.ownerId(rule.tenantId)
    console.warn(
      `Recurring rule ${rule.id} of tenant ${rule.tenantId} names a removed member as payer; its expenses are paid by the owner.`
    )

    return owner ?? rule.paidByUserId
  }

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

    const named = await this.rules.findById(rule.tenantId, rule.id)

    const paidByUserId = await this.payerOf(rule)

    const split = parseSplit(rule.defaultSplit)
    const shares =
      split === null || rule.type !== 'Expense'
        ? undefined
        : resolveSplit(rule.amount, split, paidByUserId)
    const account = await this.accounts.findById(
      rule.tenantId,
      rule.linkedAccountId
    )

    if (shares?.ok === false && account?.ownership !== 'shared') {
      console.error(
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
      type: rule.type,
      reviewStatus: 'Verify',
      statusNote: null,
    })

    return inserted === undefined ? 0 : 1
  }

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
      console.error(
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
        console.error(
          `Recurring rule ${rule.id} of tenant ${rule.tenantId} points at a deleted receiver; skipping until the rule is fixed.`
        )

        return false
      }
    }

    return true
  }
}
