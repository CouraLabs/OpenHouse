import { describe, expect, it } from 'vitest'
import type { Transaction } from '@workspace/dto'

import { groupByDay } from './group-by-day.js'

/** A transaction the tests reshape per case — every field the grouping reads. */
function row(overrides: Partial<Transaction>): Transaction {
  return {
    id: 1,
    transactionDt: '2026-10-10',
    amount: '100.00',
    currency: 'USD',
    type: 'Expense',
    status: 'Verify',
    transferGroupId: null,
    isAdjustment: false,
    ...overrides,
  } as Transaction
}

describe('groupByDay', () => {
  it('totals incomes and expenses per day', () => {
    const [day] = groupByDay([
      row({ id: 1 }),
      row({ id: 2, type: 'Income', amount: '30.00' }),
    ])

    expect(day.totals).toEqual([
      { currency: 'USD', incomes: '30.00', expenses: '100.00', net: '-70.00' },
    ])
  })

  it('leaves Canceled rows, transfers and adjustments out of the totals', () => {
    const [day] = groupByDay([
      row({ id: 1, amount: '10.00' }),
      row({ id: 2, amount: '500.00', status: 'Canceled' }),
      row({ id: 3, amount: '600.00', transferGroupId: 'pair' }),
      row({ id: 4, amount: '700.00', isAdjustment: true }),
    ])

    expect(day.transactions).toHaveLength(4)
    expect(day.totals).toEqual([
      { currency: 'USD', incomes: '0.00', expenses: '10.00', net: '-10.00' },
    ])
  })
})
