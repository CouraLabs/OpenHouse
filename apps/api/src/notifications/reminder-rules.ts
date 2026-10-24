import {
  compareMoney,
  daysBetween,
  limitPercent,
  occurrencesBetween,
  periodWindow,
  shiftDay,
  type CreditCardStatement,
  type NotificationPreferences,
  type ReminderDetail,
  type UpcomingLimitInput,
  type UpcomingRule,
} from '@workspace/poco'

import type { LogKey } from './notification-log.repository.js'

/**
 * The first hour of the tenant's day (0-23) a reminder may be sent in: a
 * bill due Friday is not worth a buzz at 00:30 Thursday. Reminders that
 * became due overnight go out on the first run from this hour on.
 */
export const SEND_FROM_HOUR = 8

/** A reminder due now: its idempotency key and what it says. */
export interface ReminderCandidate {
  key: Pick<LogKey, 'kind' | 'refId' | 'dueDate'>
  detail: ReminderDetail
}

/** What the rules evaluate, all of one tenant on its own calendar day. */
export interface ReminderInput {
  /** The tenant's today, `YYYY-MM-DD` — never the server's. */
  today: string
  preferences: NotificationPreferences
  /** The tenant's pending bills (Open, Closed, PartiallyPaid, Overdue). */
  bills: readonly CreditCardStatement[]
  rules: readonly UpcomingRule[]
  /** Rules whose transaction for today already exists. */
  generatedToday: ReadonlySet<number>
  limits: readonly UpcomingLimitInput[]
}

/**
 * The reminders due for one user on one tenant day, as a pure function of
 * the tenant's today and the user's preferences:
 *
 * - a Closed or PartiallyPaid bill from `billLeadDays` before its due date
 *   through the due date (an Open bill is only an estimate and waits for its
 *   close);
 * - an Overdue bill, once: the key is the bill and its due date, so the
 *   alert is never repeated, and a paid bill is no longer Overdue;
 * - a recurring expense (not a Daily one — a reminder every day is noise)
 *   from `recurringLeadDays` before it fires through the firing day;
 * - a limit at 80% or 100% of its cap in its current period — the highest
 *   enabled threshold reached, keyed by the period's first day so the next
 *   period alerts again.
 *
 * "Due" is a window, not a single day, so a run that was down on the exact
 * day still catches up; the log makes the repeats harmless.
 */
export function dueReminders(input: ReminderInput): ReminderCandidate[] {
  return [
    ...billReminders(input),
    ...recurringReminders(input),
    ...limitReminders(input),
  ]
}

function billReminders(input: ReminderInput): ReminderCandidate[] {
  const { today, preferences } = input
  const candidates: ReminderCandidate[] = []

  for (const bill of input.bills) {
    if (compareMoney(bill.amountDue, '0') <= 0) {
      continue
    }

    if (bill.status === 'Overdue') {
      candidates.push({
        key: { kind: 'bill_overdue', refId: bill.id, dueDate: bill.dueDate },
        detail: {
          kind: 'bill_overdue',
          accountName: bill.accountName,
          statementId: bill.id,
          amount: bill.amountDue,
          currency: bill.currency,
          dueDate: bill.dueDate,
        },
      })
      continue
    }

    const daysLeft = daysBetween(today, bill.dueDate)

    if (
      (bill.status === 'Closed' || bill.status === 'PartiallyPaid') &&
      daysLeft >= 0 &&
      daysLeft <= preferences.billLeadDays
    ) {
      candidates.push({
        key: { kind: 'bill_due', refId: bill.id, dueDate: bill.dueDate },
        detail: {
          kind: 'bill_due',
          accountName: bill.accountName,
          statementId: bill.id,
          amount: bill.amountDue,
          currency: bill.currency,
          dueDate: bill.dueDate,
          daysLeft,
        },
      })
    }
  }

  return candidates
}

function recurringReminders(input: ReminderInput): ReminderCandidate[] {
  const { today, preferences } = input
  const until = shiftDay(today, preferences.recurringLeadDays)
  const candidates: ReminderCandidate[] = []

  for (const rule of input.rules) {
    if (rule.type !== 'Expense' || rule.frequency === 'Daily') {
      continue
    }

    for (const date of occurrencesBetween(rule, today, until)) {
      if (date === today && input.generatedToday.has(rule.id)) {
        continue
      }

      candidates.push({
        key: { kind: 'recurring_due', refId: rule.id, dueDate: date },
        detail: {
          kind: 'recurring_due',
          name: rule.receiverName,
          ruleId: rule.id,
          amount: rule.amount,
          currency: rule.accountCurrency,
          type: rule.type,
          date,
          daysLeft: daysBetween(today, date),
        },
      })
    }
  }

  return candidates
}

function limitReminders(input: ReminderInput): ReminderCandidate[] {
  const { today, preferences } = input
  const candidates: ReminderCandidate[] = []

  for (const limit of input.limits) {
    const percent = limitPercent(limit.spent, limit.amount)
    const threshold =
      percent >= 100 && preferences.limitAlert100
        ? 100
        : percent >= 80 && preferences.limitAlert80
          ? 80
          : null

    if (threshold === null) {
      continue
    }

    candidates.push({
      key: {
        kind: threshold === 100 ? 'limit_100' : 'limit_80',
        refId: limit.id,
        dueDate: periodWindow(limit.type, today).from,
      },
      detail: {
        kind: 'limit_alert',
        categoryName: limit.categoryName,
        limitId: limit.id,
        limitType: limit.type,
        threshold,
        percent,
        spent: limit.spent,
        amount: limit.amount,
        currency: limit.currency,
      },
    })
  }

  return candidates
}
