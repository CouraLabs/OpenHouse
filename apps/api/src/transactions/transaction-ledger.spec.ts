import { describe, expect, it, vi } from 'vitest'

import {
  appliedDeltaFor,
  deltaFor,
  LedgerConflictError,
  lockOrder,
  retryOnLockConflict,
} from './transaction-ledger.js'

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
