import {
  formatCents,
  LIMIT_WARNING_PERCENT,
  toCents,
  upcomingKinds,
  type BalanceEvent,
  type CreditCardStatement,
  type FirstNegative,
  type ForecastOccurrence,
  type Goal,
  type ProjectedBalance,
  type ProjectionPoint,
  type UpcomingAccount,
  type UpcomingInput,
  type UpcomingItem,
  type UpcomingResponse,
  type UpcomingRule,
} from "@workspace/domain"
import { daysBetween } from "../calc/dates.js"
import { forecastOccurrences } from "../calc/forecast.js"
import { addMoney, compareMoney, negateMoney } from "../calc/money.js"
import { shiftDay } from "../calc/recurrence.js"

export type {
  BalanceEvent,
  FirstNegative,
  ProjectedBalance,
  ProjectionPoint,
  UpcomingAccount,
  UpcomingInput,
  UpcomingItem,
  UpcomingResponse,
  UpcomingRule,
}

export function projectBalance(
  startBalance: string,
  events: readonly BalanceEvent[],
  from: string
): Pick<ProjectedBalance, "points" | "endBalance" | "firstNegative"> {
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
  goal: Pick<Goal, "balance" | "balanceDt" | "targetBalance" | "targetDt">,
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

const PENDING_BILL_STATUSES: readonly CreditCardStatement["status"][] = [
  "Open",
  "Closed",
  "PartiallyPaid",
  "Overdue",
]

export function assembleUpcoming(input: UpcomingInput): UpcomingResponse {
  const { today } = input
  const to = shiftDay(today, input.days)
  const items: UpcomingItem[] = []

  const due = input.bills.filter(
    (bill) =>
      PENDING_BILL_STATUSES.includes(bill.status) &&
      compareMoney(bill.amountDue, "0") > 0 &&
      bill.dueDate <= to
  )
  const bills = due
    .map((bill) => ({ ...bill, amountDue: billPortion(bill, due) }))
    .filter((bill) => compareMoney(bill.amountDue, "0") > 0)

  for (const bill of bills) {
    items.push({
      kind: "bill",
      key: `bill-${bill.id}`,
      date: bill.dueDate,
      statementId: bill.id,
      accountId: bill.accountId,
      accountName: bill.accountName,
      currency: bill.currency,
      amount: bill.amountDue,
      estimate: bill.status === "Open",
      overdue: bill.status === "Overdue",
    })
  }

  const firings = forecastOccurrences(input.rules, today, to).filter(
    ({ date, rule }) =>
      !(date === today && input.materializedToday.has(rule.id))
  )

  for (const { date, rule } of firings) {
    items.push({
      kind: "recurring",
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
        kind: "limit",
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
        kind: "goal",
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
    (account) => account.type !== "Credit Card"
  )

  const eventsOf = (accountId: number): BalanceEvent[] =>
    firings
      .filter(({ rule }) => rule.linkedAccountId === accountId)
      .map(({ date, rule }) => ({
        date,
        amount: rule.type === "Income" ? rule.amount : negateMoney(rule.amount),
      }))

  const balances: ProjectedBalance[] = []
  const currencies = [
    ...new Set(cash.map((account) => account.currency)),
  ].sort()

  for (const currency of currencies) {
    const inCurrency = cash.filter((account) => account.currency === currency)
    const start = inCurrency.reduce(
      (sum, account) => addMoney(sum, account.balance),
      "0.00"
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
