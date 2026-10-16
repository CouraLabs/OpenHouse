import { describe, expect, it } from 'vitest'
import type { RecurringTransaction } from '@workspace/poco'

import { forecastNextMonthExpenses } from './forecast-next-month.js'

/** A rule the tests reshape per case — every field the forecast reads. */
function rule(overrides: Partial<RecurringTransaction>): RecurringTransaction {
  return {
    id: 1,
    receiverId: 1,
    receiverName: 'Landlord',
    categoryId: 1,
    categoryName: 'Housing',
    linkedAccountId: 1,
    accountName: 'Checking',
    amount: '100.00',
    type: 'Expense',
    frequency: 'Monthly',
    frequencyDay: 1,
    frequencyMonth: null,
    status: 'ACTIVE',
    createdDt: '2026-01-01T00:00:00.000Z',
    updateDt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Every account is US dollars unless a case says otherwise. */
const currencyOf = () => 'USD' as const

describe('forecastNextMonthExpenses', () => {
  it('totals nothing when no rule is an expense', () => {
    const slices = forecastNextMonthExpenses(
      [rule({ type: 'Income' })],
      new Date(2026, 10, 1),
      currencyOf
    )

    expect(slices).toEqual([])
  })

  it('fires a Monthly rule once, whatever its day', () => {
    // Day 31 clamps into November's 30 days, as the cron materializes it.
    const slices = forecastNextMonthExpenses(
      [
        rule({ frequencyDay: 5, amount: '12.34' }),
        rule({ id: 2, frequencyDay: 31, amount: '7.66' }),
      ],
      new Date(2026, 10, 1),
      currencyOf
    )

    expect(slices).toEqual([{ currency: 'USD', total: '20.00' }])
  })

  it('counts every day for a Daily rule', () => {
    const slices = forecastNextMonthExpenses(
      [rule({ frequency: 'Daily', frequencyDay: null, amount: '1.00' })],
      new Date(2026, 9, 1), // October has 31 days.
      currencyOf
    )

    expect(slices).toEqual([{ currency: 'USD', total: '31.00' }])
  })

  it('counts each occurrence of a Weekly rule weekday', () => {
    // November 2026 opens on a Sunday; the Mondays in it are the 2, 9, 16,
    // 23, and 30 — five of them; the Tuesdays are four.
    const slices = forecastNextMonthExpenses(
      [
        rule({ id: 1, frequency: 'Weekly', frequencyDay: 1, amount: '3.00' }),
        rule({ id: 2, frequency: 'Weekly', frequencyDay: 2, amount: '2.50' }),
      ],
      new Date(2026, 10, 1),
      currencyOf
    )

    expect(slices).toEqual([{ currency: 'USD', total: '25.00' }])
  })

  it('fires a Yearly rule only in its own month', () => {
    const slices = forecastNextMonthExpenses(
      [
        rule({ frequency: 'Yearly', frequencyDay: 15, frequencyMonth: 11 }),
        rule({
          id: 2,
          frequency: 'Yearly',
          frequencyDay: 15,
          frequencyMonth: 12,
        }),
      ],
      new Date(2026, 10, 1), // Next month is November, the 11th month.
      currencyOf
    )

    expect(slices).toEqual([{ currency: 'USD', total: '100.00' }])
  })

  it('keeps currencies apart and skips rules of unknown accounts', () => {
    const slices = forecastNextMonthExpenses(
      [
        rule({ id: 1, linkedAccountId: 1, amount: '10.00' }),
        rule({ id: 2, linkedAccountId: 2, amount: '5.00' }),
        rule({ id: 3, linkedAccountId: 3, amount: '999.00' }),
      ],
      new Date(2026, 10, 1),
      (accountId) =>
        accountId === 1 ? 'USD' : accountId === 2 ? 'BRL' : undefined
    )

    expect(slices).toEqual([
      { currency: 'BRL', total: '5.00' },
      { currency: 'USD', total: '10.00' },
    ])
  })
})
