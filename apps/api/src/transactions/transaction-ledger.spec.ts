import { describe, expect, it, vi } from 'vitest'

import {
  addMoney,
  appliedDeltaFor,
  deltaFor,
  isZeroMoney,
  LedgerConflictError,
  lockOrder,
  negateMoney,
  retryOnLockConflict,
} from './transaction-ledger.js'

describe('addMoney', () => {
  it('adds on cents, never through a float', () => {
    expect(addMoney('0.10', '0.20')).toBe('0.30')
    expect(addMoney('0.1', '0.2')).toBe('0.30')
    expect(addMoney('12.34', '56.78')).toBe('69.12')
  })

  it('carries across the whole', () => {
    expect(addMoney('99.99', '0.02')).toBe('100.01')
  })

  it('adds negatives and answers a negative balance', () => {
    expect(addMoney('-50.00', '-30.00')).toBe('-80.00')
    expect(addMoney('30.00', '-50.00')).toBe('-20.00')
  })

  it('handles whole amounts without a fraction', () => {
    expect(addMoney('100', '200')).toBe('300.00')
  })
})

describe('negateMoney', () => {
  it('negates an amount', () => {
    expect(negateMoney('12.34')).toBe('-12.34')
    expect(negateMoney('-12.34')).toBe('12.34')
    expect(negateMoney('0.00')).toBe('0.00')
  })
})

describe('deltaFor', () => {
  it('adds an income and subtracts an expense', () => {
    expect(deltaFor('Income', '12.34')).toBe('12.34')
    expect(deltaFor('Expense', '12.34')).toBe('-12.34')
  })
})

describe('appliedDeltaFor', () => {
  it('applies the delta while Verify or Checked', () => {
    expect(
      appliedDeltaFor({
        type: 'Expense',
        amount: '200.00',
        reviewStatus: 'Verify',
      })
    ).toBe('-200.00')
    expect(
      appliedDeltaFor({
        type: 'Income',
        amount: '200.00',
        reviewStatus: 'Checked',
      })
    ).toBe('200.00')
  })

  it('applies nothing while Canceled — money that did not move', () => {
    expect(
      appliedDeltaFor({
        type: 'Expense',
        amount: '200.00',
        reviewStatus: 'Canceled',
      })
    ).toBe('0.00')
  })
})

describe('isZeroMoney', () => {
  it('tells a zero amount from any other', () => {
    expect(isZeroMoney('0.00')).toBe(true)
    expect(isZeroMoney('-0.00')).toBe(true)
    expect(isZeroMoney('0.01')).toBe(false)
  })
})

describe('lockOrder', () => {
  it('sorts ascending and de-duplicates, whatever order a write names them', () => {
    expect(lockOrder([12, 3, 12, 7, 3])).toEqual([3, 7, 12])
    expect(lockOrder([7, 3])).toEqual(lockOrder([3, 7]))
  })

  it('answers nothing for no accounts', () => {
    expect(lockOrder([])).toEqual([])
  })
})

describe('retryOnLockConflict', () => {
  /** A drizzle query error wrapping the driver's error, as the pool throws. */
  const driverError = (code: string) =>
    Object.assign(new Error('Failed query'), { cause: { code } })
  const sleep = vi.fn(async () => {})

  it('retries a deadlock and answers the next attempt', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(driverError('40P01'))
      .mockResolvedValueOnce('done')

    await expect(retryOnLockConflict(run, { sleep })).resolves.toBe('done')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('retries a serialization failure', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(driverError('40001'))
      .mockResolvedValueOnce('done')

    await expect(retryOnLockConflict(run, { sleep })).resolves.toBe('done')
  })

  it('gives up after the last attempt with a LedgerConflictError', async () => {
    const run = vi.fn().mockRejectedValue(driverError('40P01'))

    await expect(retryOnLockConflict(run, { sleep })).rejects.toThrow(
      LedgerConflictError
    )
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('rethrows any other error at once', async () => {
    const run = vi.fn().mockRejectedValue(driverError('23505'))

    await expect(retryOnLockConflict(run, { sleep })).rejects.toThrow(
      'Failed query'
    )
    expect(run).toHaveBeenCalledTimes(1)
  })
})
