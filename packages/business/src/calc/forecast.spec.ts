import { describe, expect, it } from 'vitest'
import type { RecurringTransaction } from '@workspace/dto'
import {
  forecastExpenses,
  forecastNextMonthExpenses,
  forecastOccurrences,
} from './forecast.js'

function rule(overrides: Partial<RecurringTransaction>): RecurringTransaction {
  return {
    id: 1,
    receiverId: 1,
    receiverName: 'Landlord',
    categoryId: 1,
    categoryName: 'Housing',
    linkedAccountId: 1,
    accountName: 'Checking',
    accountCurrency: 'USD',
    amount: '100.00',
    type: 'Expense',
    frequency: 'Monthly',
    frequencyDay: 1,
    frequencyMonth: null,
    paidByUserId: null,
    paidByName: null,
    defaultSplit: null,
    nextDate: '2026-01-01',
    status: 'ACTIVE',
    createdDt: '2026-01-01T00:00:00.000Z',
    updateDt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

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
      new Date(2026, 9, 1),
      currencyOf
    )

    expect(slices).toEqual([{ currency: 'USD', total: '31.00' }])
  })

  it('counts each occurrence of a Weekly rule weekday', () => {
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
      new Date(2026, 10, 1),
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

describe('arbitrary horizons', () => {
  it('lists each firing across a window that crosses months', () => {
    const occurrences = forecastOccurrences(
      [rule({ frequency: 'Monthly', frequencyDay: 31 })],
      '2026-10-25',
      '2026-12-05'
    )

    expect(occurrences.map((occurrence) => occurrence.date)).toEqual([
      '2026-10-31',
      '2026-11-30',
    ])
  })

  it('totals a 30-day window and ignores incomes', () => {
    const slices = forecastExpenses(
      [
        rule({ id: 1, frequency: 'Weekly', frequencyDay: 1, amount: '10.00' }),
        rule({ id: 2, type: 'Income', amount: '5000.00' }),
      ],
      '2026-10-24',
      '2026-11-22',
      currencyOf
    )

    expect(slices).toEqual([{ currency: 'USD', total: '40.00' }])
  })
})
