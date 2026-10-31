import { describe, expect, it } from 'vitest'

import {
  balanceFrom,
  dailyNets,
  findBalanceDrifts,
  netOf,
} from './balance-ledger.js'

describe('netOf', () => {
  it('adds incomes, subtracts expenses, and skips canceled rows', () => {
    expect(
      netOf([
        { type: 'Income', reviewStatus: 'Checked', total: '500.00' },
        { type: 'Expense', reviewStatus: 'Verify', total: '120.50' },
        { type: 'Expense', reviewStatus: 'Canceled', total: '99.00' },
      ])
    ).toBe('379.50')
    expect(netOf([])).toBe('0.00')
  })
})

describe('balanceFrom', () => {
  it('starts from the opening balance', () => {
    expect(
      balanceFrom('100.00', [
        { type: 'Expense', reviewStatus: 'Checked', total: '30.00' },
      ])
    ).toBe('70.00')
  })
})

describe('dailyNets', () => {
  it('nets each day on its own', () => {
    expect(
      dailyNets([
        {
          date: '2026-10-01',
          type: 'Income',
          reviewStatus: 'Checked',
          total: '10.00',
        },
        {
          date: '2026-10-01',
          type: 'Expense',
          reviewStatus: 'Checked',
          total: '4.00',
        },
        {
          date: '2026-10-02',
          type: 'Expense',
          reviewStatus: 'Verify',
          total: '1.00',
        },
      ])
    ).toEqual(
      new Map([
        ['2026-10-01', '6.00'],
        ['2026-10-02', '-1.00'],
      ])
    )
  })
})

describe('findBalanceDrifts', () => {
  const account = {
    tenantId: 1,
    accountId: 9,
    name: 'Everyday',
    balance: '70.00',
    openingBalance: '100.00',
  }
  const spent = {
    accountId: 9,
    type: 'Expense' as const,
    reviewStatus: 'Checked' as const,
    total: '30.00',
  }

  it('reports no drift when the cached balance matches the ledger', () => {
    expect(findBalanceDrifts([account], [spent])).toEqual({
      checked: 1,
      drifts: [],
    })
  })

  it('reports how far the cached balance is off the ledger', () => {
    expect(
      findBalanceDrifts([{ ...account, balance: '999.00' }], [spent])
    ).toEqual({
      checked: 1,
      drifts: [
        {
          tenantId: 1,
          accountId: 9,
          name: 'Everyday',
          balance: '999.00',
          expected: '70.00',
          drift: '929.00',
        },
      ],
    })
  })
})
