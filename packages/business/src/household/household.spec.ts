import { describe, expect, it } from 'vitest'
import { toCents, type LedgerEntry } from '@workspace/domain'
import { settleUpSchema, type MemberBalance } from '@workspace/dto'
import { memberBalances, simplifyDebts } from './household.js'

const entry = (
  payerUserId: number | null,
  amount: string,
  shares: Array<[number, string]>,
  currency: LedgerEntry['currency'] = 'BRL'
): LedgerEntry => ({
  payerUserId,
  currency,
  amount,
  shares: shares.map(([userId, share]) => ({ userId, share })),
})

const balanceOf = (
  balances: MemberBalance[],
  userId: number,
  currency = 'BRL'
) =>
  balances.find((item) => item.userId === userId && item.currency === currency)
    ?.balance

describe('memberBalances', () => {
  it('credits the payer what others owe and debits the others', () => {
    const balances = memberBalances([
      entry(1, '100.00', [
        [1, '50.00'],
        [2, '50.00'],
      ]),
    ])

    expect(balanceOf(balances, 1)).toBe('50.00')
    expect(balanceOf(balances, 2)).toBe('-50.00')
  })

  it('nets what each paid for the other', () => {
    const balances = memberBalances([
      entry(1, '100.00', [
        [1, '50.00'],
        [2, '50.00'],
      ]),
      entry(2, '30.00', [
        [1, '15.00'],
        [2, '15.00'],
      ]),
    ])

    expect(balanceOf(balances, 1)).toBe('35.00')
    expect(balanceOf(balances, 2)).toBe('-35.00')
  })

  it('keeps currencies apart', () => {
    const balances = memberBalances([
      entry(1, '100.00', [[2, '100.00']], 'BRL'),
      entry(2, '40.00', [[1, '40.00']], 'USD'),
    ])

    expect(balanceOf(balances, 1, 'BRL')).toBe('100.00')
    expect(balanceOf(balances, 1, 'USD')).toBe('-40.00')
    expect(balanceOf(balances, 2, 'USD')).toBe('40.00')
  })

  it('ignores entries with no payer or no shares', () => {
    expect(
      memberBalances([
        entry(null, '10.00', [[1, '10.00']]),
        entry(1, '5.00', []),
      ])
    ).toEqual([])
  })

  it('a settlement zeroes the pair', () => {
    const balances = memberBalances([
      entry(1, '240.00', [
        [1, '120.00'],
        [2, '120.00'],
      ]),
      entry(2, '120.00', [[1, '120.00']]),
    ])

    expect(balanceOf(balances, 1)).toBe('0.00')
    expect(balanceOf(balances, 2)).toBe('0.00')
  })

  it('always adds up to zero per currency', () => {
    const balances = memberBalances([
      entry(1, '100.01', [
        [1, '33.34'],
        [2, '33.34'],
        [3, '33.33'],
      ]),
      entry(3, '10.00', [
        [2, '4.00'],
        [4, '6.00'],
      ]),
    ])

    const sum = balances.reduce((acc, item) => acc + toCents(item.balance), 0n)

    expect(sum).toBe(0n)
  })
})

function apply(
  balances: MemberBalance[],
  transfers: ReturnType<typeof simplifyDebts>
) {
  const left = new Map(
    balances.map((item) => [
      `${item.currency}:${item.userId}`,
      toCents(item.balance),
    ])
  )

  for (const transfer of transfers) {
    const from = `${transfer.currency}:${transfer.fromUserId}`
    const to = `${transfer.currency}:${transfer.toUserId}`

    left.set(from, (left.get(from) ?? 0n) + toCents(transfer.amount))
    left.set(to, (left.get(to) ?? 0n) - toCents(transfer.amount))
  }

  return [...left.values()]
}

describe('simplifyDebts', () => {
  it('pays one debt with one transfer', () => {
    expect(
      simplifyDebts([
        { userId: 1, currency: 'BRL', balance: '120.00' },
        { userId: 2, currency: 'BRL', balance: '-120.00' },
      ])
    ).toEqual([
      { currency: 'BRL', fromUserId: 2, toUserId: 1, amount: '120.00' },
    ])
  })

  it('needs at most n - 1 transfers for 3 members', () => {
    const balances: MemberBalance[] = [
      { userId: 1, currency: 'BRL', balance: '70.00' },
      { userId: 2, currency: 'BRL', balance: '-30.00' },
      { userId: 3, currency: 'BRL', balance: '-40.00' },
    ]
    const transfers = simplifyDebts(balances)

    expect(transfers).toHaveLength(2)
    expect(apply(balances, transfers).every((cents) => cents === 0n)).toBe(true)
  })

  it('cancels equal opposite balances first (4 members)', () => {
    const balances: MemberBalance[] = [
      { userId: 1, currency: 'BRL', balance: '50.00' },
      { userId: 2, currency: 'BRL', balance: '30.00' },
      { userId: 3, currency: 'BRL', balance: '-30.00' },
      { userId: 4, currency: 'BRL', balance: '-50.00' },
    ]
    const transfers = simplifyDebts(balances)

    expect(transfers).toHaveLength(2)
    expect(transfers).toContainEqual({
      currency: 'BRL',
      fromUserId: 4,
      toUserId: 1,
      amount: '50.00',
    })
    expect(apply(balances, transfers).every((cents) => cents === 0n)).toBe(true)
  })

  it('settles 5 members with at most 4 transfers', () => {
    const balances: MemberBalance[] = [
      { userId: 1, currency: 'BRL', balance: '100.00' },
      { userId: 2, currency: 'BRL', balance: '45.50' },
      { userId: 3, currency: 'BRL', balance: '-60.25' },
      { userId: 4, currency: 'BRL', balance: '-35.00' },
      { userId: 5, currency: 'BRL', balance: '-50.25' },
    ]
    const transfers = simplifyDebts(balances)

    expect(transfers.length).toBeLessThanOrEqual(4)
    expect(apply(balances, transfers).every((cents) => cents === 0n)).toBe(true)
  })

  it('never moves money across currencies', () => {
    const balances: MemberBalance[] = [
      { userId: 1, currency: 'BRL', balance: '100.00' },
      { userId: 2, currency: 'BRL', balance: '-100.00' },
      { userId: 1, currency: 'USD', balance: '-20.00' },
      { userId: 3, currency: 'USD', balance: '20.00' },
    ]
    const transfers = simplifyDebts(balances)

    expect(transfers).toEqual([
      { currency: 'BRL', fromUserId: 2, toUserId: 1, amount: '100.00' },
      { currency: 'USD', fromUserId: 1, toUserId: 3, amount: '20.00' },
    ])
  })

  it('answers nothing when everyone is square', () => {
    expect(
      simplifyDebts([
        { userId: 1, currency: 'BRL', balance: '0.00' },
        { userId: 2, currency: 'BRL', balance: '0.00' },
      ])
    ).toEqual([])
  })
})

describe('settleUpSchema', () => {
  const base = {
    fromUserId: 1,
    toUserId: 2,
    amount: '10.00',
    currency: 'BRL',
    fromAccountId: 3,
    transactionDt: '2026-01-02',
  }

  it('accepts a settlement and rejects paying oneself', () => {
    expect(settleUpSchema.safeParse(base).success).toBe(true)
    expect(settleUpSchema.safeParse({ ...base, toUserId: 1 }).success).toBe(
      false
    )
    expect(settleUpSchema.safeParse({ ...base, amount: '0.00' }).success).toBe(
      false
    )
  })
})
