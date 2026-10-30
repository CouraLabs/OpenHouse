import { z } from 'zod'

import type { AccountType } from './accounts.js'
import { daysBetween } from './credit-card-cycle.js'
import type { Currency } from './currencies.js'
import { forecastOccurrences, type ForecastOccurrence } from './forecast.js'
import type { Goal } from './goals.js'
import type { LimitType, LimitUsage } from './limits.js'
import {
  addMoney,
  compareMoney,
  formatCents,
  negateMoney,
  toCents,
} from './money.js'
import { shiftDay } from './recurrence.js'
import type { RecurringTransaction } from './recurring-transactions.js'
import type { CreditCardStatement } from './credit-card-statements.js'
import type { TransactionType } from './transactions.js'

export const DEFAULT_UPCOMING_DAYS = 30

export const MAX_UPCOMING_DAYS = 365

export const upcomingQuerySchema = z.object({
  days: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_UPCOMING_DAYS)
    .default(DEFAULT_UPCOMING_DAYS),
})

export type UpcomingQuery = z.infer<typeof upcomingQuerySchema>

export const LIMIT_WARNING_PERCENT = 80

export const upcomingKinds = ['bill', 'recurring', 'limit', 'goal'] as const

export type UpcomingKind = (typeof upcomingKinds)[number]

export interface UpcomingBill {
  kind: 'bill'
  key: string
  date: string
  statementId: number
  accountId: number
  accountName: string
  currency: Currency
  amount: string
  estimate: boolean
  overdue: boolean
}

export interface UpcomingRecurring {
  kind: 'recurring'
  key: string
  date: string
  ruleId: number
  name: string
  accountId: number
  accountName: string
  currency: Currency
  amount: string
  type: TransactionType
}

export interface UpcomingLimit {
  kind: 'limit'
  key: string
  date: string
  limitId: number
  categoryName: string
  limitType: LimitType
  currency: Currency
  spent: string
  amount: string
  percent: number
}

export interface UpcomingGoal {
  kind: 'goal'
  key: string
  date: string
  goalId: number
  name: string
  currency: Currency
  shortfall: string
  targetDt: string | null
}

export type UpcomingItem =
  UpcomingBill | UpcomingRecurring | UpcomingLimit | UpcomingGoal

export interface ProjectionPoint {
  date: string
  balance: string
}

export interface FirstNegative {
  date: string
  balance: string
}

export interface ProjectedBalance {
  accountId: number | null
  accountName: string | null
  currency: Currency
  startBalance: string
  endBalance: string
  points: ProjectionPoint[]
  firstNegative: FirstNegative | null
}

export interface UpcomingResponse {
  from: string
  to: string
  items: UpcomingItem[]
  balances: ProjectedBalance[]
}

export interface BalanceEvent {
  date: string
  amount: string
}

export function projectBalance(
  startBalance: string,
  events: readonly BalanceEvent[],
  from: string
): Pick<ProjectedBalance, 'points' | 'endBalance' | 'firstNegative'> {
  const byDay = new Map<string, bigint>()

  for (const event of events) {
    const day = event.date < from ? from : event.date

    byDay.set(day, (byDay.get(day) ?? 0n) + toCents(event.amount))
  }

  let balance = toCents(startBalance)
  let firstNegative: FirstNegative | null =
    balance < 0n ? { date: from, balance: formatCents(balance) } : null
  const points: ProjectionPoint[] = []

  for (const day of [...byDay.keys()].sort()) {
    balance += byDay.get(day) ?? 0n
    points.push({ date: day, balance: formatCents(balance) })

    if (firstNegative === null && balance < 0n) {
      firstNegative = { date: day, balance: formatCents(balance) }
    }
  }

  return { points, endBalance: formatCents(balance), firstNegative }
}

export function limitPercent(spent: string, amount: string): number {
  const cap = toCents(amount)

  return cap <= 0n ? 0 : Number((toCents(spent) * 100n) / cap)
}

export function goalShortfall(
  goal: Pick<Goal, 'balance' | 'balanceDt' | 'targetBalance' | 'targetDt'>,
  current: string,
  today: string
): string | null {
  if (goal.targetDt === null) {
    return null
  }

  const start = toCents(goal.balance)
  const target = toCents(goal.targetBalance)
  const total = daysBetween(goal.balanceDt, goal.targetDt)
  const elapsed = Math.min(
    Math.max(daysBetween(goal.balanceDt, today), 0),
    Math.max(total, 0)
  )
  const expected =
    total <= 0
      ? target
      : start + ((target - start) * BigInt(elapsed)) / BigInt(total)
  const behind = expected - toCents(current)

  return behind > 0n ? formatCents(behind) : null
}

export interface UpcomingAccount {
  id: number
  name: string
  currency: Currency
  type: AccountType
  balance: string
}

export interface UpcomingGoalInput {
  goal: Pick<
    Goal,
    | 'id'
    | 'name'
    | 'balance'
    | 'balanceDt'
    | 'targetBalance'
    | 'targetDt'
    | 'currency'
  >
  currentBalance: string
}

export type UpcomingRule = Pick<
  RecurringTransaction,
  | 'id'
  | 'receiverName'
  | 'linkedAccountId'
  | 'accountName'
  | 'accountCurrency'
  | 'amount'
  | 'type'
  | 'frequency'
  | 'frequencyDay'
  | 'frequencyMonth'
>

export type UpcomingLimitInput = Pick<
  LimitUsage,
  'id' | 'categoryName' | 'amount' | 'type' | 'currency' | 'spent'
>

export interface UpcomingInput {
  today: string
  days: number
  accounts: readonly UpcomingAccount[]
  bills: readonly CreditCardStatement[]
  rules: readonly UpcomingRule[]
  materializedToday: ReadonlySet<number>
  limits: readonly UpcomingLimitInput[]
  goals: readonly UpcomingGoalInput[]
}

const PENDING_BILL_STATUSES: readonly CreditCardStatement['status'][] = [
  'Open',
  'Closed',
  'PartiallyPaid',
  'Overdue',
]

export function assembleUpcoming(input: UpcomingInput): UpcomingResponse {
  const { today } = input
  const to = shiftDay(today, input.days)
  const items: UpcomingItem[] = []

  const due = input.bills.filter(
    (bill) =>
      PENDING_BILL_STATUSES.includes(bill.status) &&
      compareMoney(bill.amountDue, '0') > 0 &&
      bill.dueDate <= to
  )
  const bills = due
    .map((bill) => ({ ...bill, amountDue: billPortion(bill, due) }))
    .filter((bill) => compareMoney(bill.amountDue, '0') > 0)

  for (const bill of bills) {
    items.push({
      kind: 'bill',
      key: `bill-${bill.id}`,
      date: bill.dueDate,
      statementId: bill.id,
      accountId: bill.accountId,
      accountName: bill.accountName,
      currency: bill.currency,
      amount: bill.amountDue,
      estimate: bill.status === 'Open',
      overdue: bill.status === 'Overdue',
    })
  }

  const firings = forecastOccurrences(input.rules, today, to).filter(
    ({ date, rule }) =>
      !(date === today && input.materializedToday.has(rule.id))
  )

  for (const { date, rule } of firings) {
    items.push({
      kind: 'recurring',
      key: `recurring-${rule.id}-${date}`,
      date,
      ruleId: rule.id,
      name: rule.receiverName,
      accountId: rule.linkedAccountId,
      accountName: rule.accountName,
      currency: rule.accountCurrency,
      amount: rule.amount,
      type: rule.type,
    })
  }

  for (const usage of input.limits) {
    const percent = limitPercent(usage.spent, usage.amount)

    if (percent >= LIMIT_WARNING_PERCENT) {
      items.push({
        kind: 'limit',
        key: `limit-${usage.id}`,
        date: today,
        limitId: usage.id,
        categoryName: usage.categoryName,
        limitType: usage.type,
        currency: usage.currency,
        spent: usage.spent,
        amount: usage.amount,
        percent,
      })
    }
  }

  for (const { goal, currentBalance } of input.goals) {
    const shortfall = goalShortfall(goal, currentBalance, today)

    if (shortfall !== null) {
      items.push({
        kind: 'goal',
        key: `goal-${goal.id}`,
        date: today,
        goalId: goal.id,
        name: goal.name,
        currency: goal.currency,
        shortfall,
        targetDt: goal.targetDt,
      })
    }
  }

  items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      upcomingKinds.indexOf(a.kind) - upcomingKinds.indexOf(b.kind) ||
      a.key.localeCompare(b.key)
  )

  return {
    from: today,
    to,
    items,
    balances: projectAll(input, firings, bills),
  }
}

function billPortion(
  bill: CreditCardStatement,
  listed: readonly CreditCardStatement[]
): string {
  const carriedIn = listed.some(
    (prior) =>
      prior.accountId === bill.accountId && prior.carriedTo === bill.dueDate
  )

  return carriedIn
    ? addMoney(bill.amountDue, negateMoney(bill.previousBalance))
    : bill.amountDue
}

function projectAll(
  input: UpcomingInput,
  firings: readonly ForecastOccurrence<UpcomingRule>[],
  bills: readonly CreditCardStatement[]
): ProjectedBalance[] {
  const cash = input.accounts.filter(
    (account) => account.type !== 'Credit Card'
  )

  const eventsOf = (accountId: number): BalanceEvent[] =>
    firings
      .filter(({ rule }) => rule.linkedAccountId === accountId)
      .map(({ date, rule }) => ({
        date,
        amount: rule.type === 'Income' ? rule.amount : negateMoney(rule.amount),
      }))

  const balances: ProjectedBalance[] = []
  const currencies = [
    ...new Set(cash.map((account) => account.currency)),
  ].sort()

  for (const currency of currencies) {
    const inCurrency = cash.filter((account) => account.currency === currency)
    const start = inCurrency.reduce(
      (sum, account) => addMoney(sum, account.balance),
      '0.00'
    )
    const events = [
      ...inCurrency.flatMap((account) => eventsOf(account.id)),
      ...bills
        .filter((bill) => bill.currency === currency)
        .map((bill) => ({
          date: bill.dueDate,
          amount: negateMoney(bill.amountDue),
        })),
    ]

    balances.push({
      accountId: null,
      accountName: null,
      currency,
      startBalance: start,
      ...projectBalance(start, events, input.today),
    })

    for (const account of inCurrency) {
      balances.push({
        accountId: account.id,
        accountName: account.name,
        currency,
        startBalance: account.balance,
        ...projectBalance(account.balance, eventsOf(account.id), input.today),
      })
    }
  }

  return balances
}
