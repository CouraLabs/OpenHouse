import type { LogKey } from '@workspace/db'
import {
  type CreditCardStatement,
  type NotificationPreferences,
  type ReminderDetail,
  type UpcomingLimitInput,
  type UpcomingRule,
} from '@workspace/dto'

import { daysBetween } from '../calc/dates.js'
import { shiftDay } from '../calc/recurrence.js'
import { compareMoney } from '../calc/money.js'
import { periodWindow } from '../calc/limit-period.js'
import { occurrencesBetween } from '../calc/recurrence.js'
import { limitPercent } from '../upcoming/upcoming.js'

export const SEND_FROM_HOUR = 8

export interface ReminderCandidate {
  key: Pick<LogKey, 'kind' | 'refId' | 'dueDate'>
  detail: ReminderDetail
}

export interface ReminderInput {
  today: string
  preferences: NotificationPreferences
  bills: readonly CreditCardStatement[]
  rules: readonly UpcomingRule[]
  generatedToday: ReadonlySet<number>
  limits: readonly UpcomingLimitInput[]
}

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
