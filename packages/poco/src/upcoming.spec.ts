import { describe, expect, it } from 'vitest'

import type { CreditCardStatement } from './credit-card-statements.js'
import type { Goal } from './goals.js'
import type { LimitUsage } from './limits.js'
import type { RecurringTransaction } from './recurring-transactions.js'
import {
  assembleUpcoming,
  goalShortfall,
  limitPercent,
  projectBalance,
  type UpcomingAccount,
  type UpcomingInput,
} from './upcoming.js'

function rule(overrides: Partial<RecurringTransaction>): RecurringTransaction {
  return {
    id: 1,
    receiverId: 1,
    receiverName: 'Landlord',
    categoryId: 1,
    categoryName: 'Housing',
    linkedAccountId: 1,
    accountName: 'Checking',
    accountCurrency: 'BRL',
    amount: '100.00',
    type: 'Expense',
    frequency: 'Monthly',
    frequencyDay: 10,
    frequencyMonth: null,
    paidByUserId: null,
    paidByName: null,
    defaultSplit: null,
    status: 'ACTIVE',
    createdDt: '2026-01-01T00:00:00.000Z',
    updateDt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function bill(overrides: Partial<CreditCardStatement>): CreditCardStatement {
  return {
    id: 7,
    accountId: 9,
    accountName: 'Nubank',
    currency: 'BRL',
    periodStart: '2026-10-01',
    closeDate: '2026-10-28',
    closesOn: '2026-10-27',
    dueDate: '2026-11-05',
    closedAt: null,
    charges: '300.00',
    credits: '0.00',
    total: '300.00',
    previousBalance: '0.00',
    paid: '0.00',
    amountDue: '300.00',
    status: 'Closed',
    carriedTo: null,
    minimumDue: null,
    bankTotal: null,
    reconciledAt: null,
    transactionCount: 3,
    ...overrides,
  }
}

const checking: UpcomingAccount = {
  id: 1,
  name: 'Checking',
  currency: 'BRL',
  type: 'Checking',
  balance: '500.00',
}

const card: UpcomingAccount = {
  id: 9,
  name: 'Nubank',
  currency: 'BRL',
  type: 'Credit Card',
  balance: '-300.00',
}

function input(overrides: Partial<UpcomingInput>): UpcomingInput {
  return {
    today: '2026-10-24',
    days: 30,
    accounts: [checking, card],
    bills: [],
    rules: [],
    materializedToday: new Set(),
    limits: [],
    goals: [],
    ...overrides,
  }
}

describe('projectBalance', () => {
  it('finds the first day the balance goes negative', () => {
    const projection = projectBalance(
      '100.00',
      [
        { date: '2026-11-10', amount: '-330.00' },
        { date: '2026-11-02', amount: '-50.00' },
        { date: '2026-11-20', amount: '1000.00' },
      ],
      '2026-10-24'
    )

    expect(projection.firstNegative).toEqual({
      date: '2026-11-10',
      balance: '-280.00',
    })
    expect(projection.points.map((point) => point.date)).toEqual([
      '2026-11-02',
      '2026-11-10',
      '2026-11-20',
    ])
    expect(projection.endBalance).toBe('720.00')
  })

  it('reports no negative day when the balance stays at or above zero', () => {
    const projection = projectBalance(
      '100.00',
      [{ date: '2026-11-02', amount: '-100.00' }],
      '2026-10-24'
    )

    expect(projection.firstNegative).toBeNull()
  })

  it('reports the first day itself when the balance starts negative', () => {
    const projection = projectBalance('-5.00', [], '2026-10-24')

    expect(projection.firstNegative).toEqual({
      date: '2026-10-24',
      balance: '-5.00',
    })
  })

  it('nets same-day movements before judging the day', () => {
    const projection = projectBalance(
      '10.00',
      [
        { date: '2026-11-01', amount: '-50.00' },
        { date: '2026-11-01', amount: '100.00' },
      ],
      '2026-10-24'
    )

    expect(projection.firstNegative).toBeNull()
  })

  it('moves an overdue movement onto the first day', () => {
    const projection = projectBalance(
      '10.00',
      [{ date: '2026-10-01', amount: '-50.00' }],
      '2026-10-24'
    )

    expect(projection.firstNegative?.date).toBe('2026-10-24')
  })
})

describe('assembleUpcoming', () => {
  it('merges the four sources in chronological order', () => {
    const limit: LimitUsage = {
      id: 3,
      categoryId: 4,
      categoryName: 'Groceries',
      amount: '1000.00',
      type: 'Monthly',
      currency: 'BRL',
      status: 'ACTIVE',
      createdDt: '2026-01-01T00:00:00.000Z',
      updateDt: '2026-01-01T00:00:00.000Z',
      spent: '850.00',
      excludedCount: 0,
    }
    const goal: Goal = {
      id: 5,
      name: 'Emergency fund',
      linkedAccountId: 1,
      accountName: 'Checking',
      balance: '0.00',
      balanceDt: '2026-10-04',
      targetBalance: '1000.00',
      targetDt: '2026-12-03',
      currency: 'BRL',
      accountCurrency: 'BRL',
      status: 'ACTIVE',
      createdDt: '2026-01-01T00:00:00.000Z',
      updateDt: '2026-01-01T00:00:00.000Z',
    }

    const upcoming = assembleUpcoming(
      input({
        bills: [bill({})],
        rules: [rule({})],
        limits: [limit],
        goals: [{ goal, currentBalance: '100.00' }],
      })
    )

    expect(upcoming.items.map((item) => item.key)).toEqual([
      'limit-3',
      'goal-5',
      'bill-7',
      'recurring-1-2026-11-10',
    ])
    expect(upcoming.to).toBe('2026-11-23')
  })

  it('weighs a card bill on the currency line and flags the first negative day', () => {
    const upcoming = assembleUpcoming(
      input({
        bills: [bill({ amountDue: '600.00' })],
        rules: [rule({ amount: '100.00' })],
      })
    )

    const total = upcoming.balances.find((line) => line.accountId === null)
    const account = upcoming.balances.find((line) => line.accountId === 1)

    // 500 - 600 (bill, Nov 5) goes negative; the account alone does not
    // see the bill, only the rent on Nov 10.
    expect(total?.firstNegative).toEqual({
      date: '2026-11-05',
      balance: '-100.00',
    })
    expect(account?.firstNegative).toBeNull()
    expect(account?.endBalance).toBe('400.00')
    // A credit card is projected nowhere on its own.
    expect(upcoming.balances.some((line) => line.accountId === 9)).toBe(false)
  })

  it('skips today when the rule already generated its transaction', () => {
    const rules = [rule({ frequency: 'Daily', frequencyDay: null })]
    const without = assembleUpcoming(
      input({ rules, days: 1, materializedToday: new Set([1]) })
    )

    expect(without.items.map((item) => item.date)).toEqual(['2026-10-25'])
  })

  it('keeps an overdue bill first and drops paid or empty ones', () => {
    const upcoming = assembleUpcoming(
      input({
        bills: [
          bill({ id: 1, status: 'Overdue', dueDate: '2026-10-10' }),
          bill({ id: 2, status: 'Paid', amountDue: '0.00' }),
          bill({ id: 3, status: 'Open', dueDate: '2027-03-01' }),
        ],
      })
    )

    expect(upcoming.items).toHaveLength(1)
    expect(upcoming.items[0]).toMatchObject({ kind: 'bill', overdue: true })
  })

  it('marks an Open bill as an estimate and an Income rule as incoming', () => {
    const upcoming = assembleUpcoming(
      input({
        bills: [bill({ status: 'Open' })],
        rules: [rule({ type: 'Income', amount: '50.00' })],
      })
    )

    expect(upcoming.items[0]).toMatchObject({ kind: 'bill', estimate: true })
    expect(
      upcoming.balances.find((line) => line.accountId === 1)?.endBalance
    ).toBe('550.00')
  })
})

describe('assembleUpcoming card carry-over', () => {
  it('counts a remainder carried into the next listed bill only once', () => {
    // The first bill leaves 200.00 unpaid and carries it into the second,
    // whose amountDue (350.00) already includes it: only 150.00 is new there.
    const upcoming = assembleUpcoming(
      input({
        days: 60,
        bills: [
          bill({
            id: 7,
            paid: '100.00',
            amountDue: '200.00',
            carriedTo: '2026-12-05',
          }),
          bill({
            id: 8,
            dueDate: '2026-12-05',
            previousBalance: '200.00',
            total: '150.00',
            amountDue: '350.00',
          }),
        ],
      })
    )

    expect(
      upcoming.items.filter((item) => item.kind === 'bill').map((item) => item.amount)
    ).toEqual(['200.00', '150.00'])
  })
})

describe('limitPercent and goalShortfall', () => {
  it('rounds a limit share down', () => {
    expect(limitPercent('799.99', '1000.00')).toBe(79)
    expect(limitPercent('1000.00', '1000.00')).toBe(100)
  })

  it('measures a goal against its straight-line pace', () => {
    const goal = {
      balance: '0.00',
      balanceDt: '2026-10-01',
      targetBalance: '1000.00',
      targetDt: '2026-11-30',
    }

    // 30 of 60 days gone: 500 expected.
    expect(goalShortfall(goal, '100.00', '2026-10-31')).toBe('400.00')
    expect(goalShortfall(goal, '500.00', '2026-10-31')).toBeNull()
    expect(
      goalShortfall({ ...goal, targetDt: null }, '0.00', '2026-10-31')
    ).toBeNull()
  })
})
