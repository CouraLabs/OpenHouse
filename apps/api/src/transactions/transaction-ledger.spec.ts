import { describe, expect, it, vi } from 'vitest'

import { appliedDeltaFor, deltaFor } from './transaction-ledger.js'
import {
  LedgerBatchPlan,
  changesOf,
  stampFor,
} from '../common/ledger/ledger-batch.js'
import { LedgerConflictError } from '../common/ledger/ledger-conflict.js'

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

describe('LedgerBatchPlan', () => {
  it('answers a guard that matched no rows with a conflict', async () => {
    const db = {
      batch: vi.fn(async () => [{ meta: { changes: 0 } }, [{ id: 1 }]]),
    } as never

    const plan = new LedgerBatchPlan()
      .guarded({} as never, 1, 'the account')
      .add({} as never)

    await expect(plan.run(db)).rejects.toThrow(LedgerConflictError)
  })

  it('answers the results when every guard matched', async () => {
    const db = {
      batch: vi.fn(async () => [
        { meta: { changes: 1 } },
        [{ id: 1 }],
        { meta: { changes: 0 } },
      ]),
    } as never

    const plan = new LedgerBatchPlan()
      .guarded({} as never, 1, 'the account')
      .add({} as never)

    await expect(plan.run(db)).resolves.toHaveLength(3)
  })

  it('counts a returning statement’s rows as its affected-row count', () => {
    expect(changesOf([{ id: 1 }, { id: 2 }])).toBe(2)
    expect(changesOf({ results: [], meta: { changes: 3 } })).toBe(3)
    expect(changesOf({})).toBe(0)
  })
})

describe('stampFor', () => {
  it('never stamps the value the optimistic guard matches on', () => {
    const read = { updateDt: new Date(1_700_000_000_000) }

    vi.setSystemTime(read.updateDt)

    expect(stampFor(read).getTime()).toBe(read.updateDt.getTime() + 1)

    vi.setSystemTime(new Date(1_700_000_000_500))

    expect(stampFor(read).getTime()).toBe(1_700_000_000_500)

    vi.useRealTimers()
  })
})
