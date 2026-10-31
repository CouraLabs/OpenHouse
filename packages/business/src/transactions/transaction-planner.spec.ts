import { describe, expect, it, vi } from 'vitest'
import type {
  SplitDefaultsInputs,
  StatementTarget,
  Transaction,
  TransactionWrite,
} from '@workspace/db'
import { STATEMENT_CLOSED } from '@workspace/dto'

import {
  defaultSplitShares,
  plannedDeletes,
  plannedStatusFlips,
  TransactionPlanner,
  withClosedWarning,
} from './transaction-planner.js'

const bill: StatementTarget = {
  kind: 'bill',
  accountId: 9,
  window: {
    periodStart: '2026-09-25',
    closeDate: '2026-10-25',
    dueDate: '2026-11-05',
  },
  closed: false,
  pinned: false,
}

const write = (overrides: Partial<TransactionWrite> = {}): TransactionWrite => ({
  name: 'Groceries',
  note: null,
  invoice: null,
  amount: '30.00',
  transactionDt: '2026-10-14',
  linkedAccountId: 9,
  categoryId: 3,
  receiverId: null,
  recurringId: null,
  type: 'Expense',
  reviewStatus: 'Verify',
  statusNote: null,
  ...overrides,
})

const stored = (overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id: 1,
    linkedAccountId: 9,
    transactionDt: '2026-10-14',
    type: 'Expense',
    amount: '30.00',
    reviewStatus: 'Verify',
    transferGroupId: null,
    statementId: 40,
    statementPinned: false,
    ...overrides,
  }) as Transaction

const household: SplitDefaultsInputs = {
  unsplitMode: 'household',
  ownership: 'personal',
  memberIds: [7, 8],
}

function planner(inputs: SplitDefaultsInputs = household) {
  const transactions = { splitDefaultsOf: vi.fn(async () => inputs) }
  const placer = {
    place: vi.fn(async (): Promise<StatementTarget> => bill),
    replace: vi.fn(
      async (): Promise<StatementTarget> => ({
        kind: 'keep',
        statementId: 40,
        statementPinned: false,
      })
    ),
  }

  return {
    transactions,
    placer,
    service: new TransactionPlanner(transactions, placer),
  }
}

describe('TransactionPlanner.insert', () => {
  it('defaults the payer to the author and applies the signed amount', async () => {
    const { service } = planner({ ...household, unsplitMode: 'personal' })

    const planned = await service.insert(1, 7, write())

    expect(planned.columns.paidByUserId).toBe(7)
    expect(planned.delta).toBe('-30.00')
    expect(planned.target).toEqual(bill)
    expect(planned.shares).toEqual([])
  })

  it('splits an unsplit household expense equally, rounding to the payer', async () => {
    const { service } = planner({ ...household, memberIds: [7, 8, 9] })

    const planned = await service.insert(1, 8, write({ amount: '10.00' }))

    expect(planned.shares).toEqual([
      { userId: 7, share: '3.33' },
      { userId: 8, share: '3.34' },
      { userId: 9, share: '3.33' },
    ])
  })

  it('keeps explicit shares and skips the defaults lookup', async () => {
    const { service, transactions } = planner()
    const splits = [{ userId: 8, share: '30.00' }]

    const planned = await service.insert(1, 7, write({ splits }))

    expect(planned.shares).toEqual(splits)
    expect(transactions.splitDefaultsOf).not.toHaveBeenCalled()
  })

  it('splits no income, transfer, adjustment, settlement, or unpaid row', async () => {
    const { service, transactions } = planner()

    for (const overrides of [
      { type: 'Income' as const },
      { transferGroupId: 'g' },
      { isAdjustment: true },
      { isSettlement: true },
      { paidByUserId: null },
    ]) {
      expect((await service.insert(1, 7, write(overrides))).shares).toEqual([])
    }

    expect(transactions.splitDefaultsOf).not.toHaveBeenCalled()
  })

  it("places an installment on its own month's bill and pins it", async () => {
    const { service, placer } = planner()

    const planned = await service.insert(
      1,
      7,
      write({ installment: { groupId: 'g', number: 3, count: 4 } })
    )

    expect(placer.place).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ linkedAccountId: 9 }),
      { offset: 2, pinned: true }
    )
    expect(planned.installment).toEqual({ groupId: 'g', number: 3, count: 4 })
    expect(planned.columns).not.toHaveProperty('installment')
  })
})

describe('TransactionPlanner.update', () => {
  it('reverts the old amount, applies the new one, and replans the bill', async () => {
    const { service, placer } = planner()

    const planned = await service.update(
      1,
      stored(),
      write({ amount: '50.00' }),
      undefined
    )

    expect(planned.revert).toBe('30.00')
    expect(planned.apply).toBe('-50.00')
    expect(planned.target).toEqual({
      kind: 'keep',
      statementId: 40,
      statementPinned: false,
    })
    expect(placer.replace).toHaveBeenCalledTimes(1)
    expect(planned).not.toHaveProperty('sibling')
  })

  it('moves the transfer sibling by the same amount change', async () => {
    const { service } = planner()
    const sibling = stored({
      id: 2,
      type: 'Income',
      linkedAccountId: 11,
      transferGroupId: 'g',
      statementId: null,
    })

    const planned = await service.update(
      1,
      stored({ transferGroupId: 'g' }),
      write({ amount: '50.00', transferGroupId: 'g' }),
      sibling
    )

    expect(planned.sibling?.shift).toBe('20.00')
    expect(planned.sibling?.set.amount).toBe('50.00')
  })
})

describe('TransactionPlanner.transferLegs', () => {
  it('writes an expense out and an income in under one transfer group', async () => {
    const { service } = planner()

    const [from, to] = await service.transferLegs(1, 7, {
      amount: '100.00',
      transactionDt: '2026-10-14',
      categoryId: 3,
      fromAccountId: 10,
      toAccountId: 9,
      note: null,
      paymentStatementId: 40,
    })

    expect(from.columns).toMatchObject({
      name: 'TRANSFER_OUT',
      type: 'Expense',
      linkedAccountId: 10,
      paidByUserId: null,
    })
    expect(to.columns).toMatchObject({
      name: 'TRANSFER_IN',
      type: 'Income',
      linkedAccountId: 9,
      paymentStatementId: 40,
    })
    expect(from.columns.transferGroupId).toBe(to.columns.transferGroupId)
    expect(from.delta).toBe('-100.00')
    expect(to.delta).toBe('100.00')
  })

  it('records a settlement as a debt paid to the receiving member', async () => {
    const { service } = planner()

    const [from] = await service.transferLegs(1, 7, {
      amount: '25.00',
      transactionDt: '2026-10-14',
      categoryId: 3,
      fromAccountId: 10,
      toAccountId: 12,
      note: null,
      paymentStatementId: null,
      settlement: { fromUserId: 7, toUserId: 8 },
    })

    expect(from.columns).toMatchObject({ paidByUserId: 7, isSettlement: true })
    expect(from.shares).toEqual([{ userId: 8, share: '25.00' }])
  })
})

describe('defaultSplitShares', () => {
  it('splits nothing for a personal tenant, a shared account, or no members', () => {
    expect(
      defaultSplitShares('10.00', 7, { ...household, unsplitMode: 'personal' })
    ).toEqual([])
    expect(
      defaultSplitShares('10.00', 7, { ...household, ownership: 'shared' })
    ).toEqual([])
    expect(
      defaultSplitShares('10.00', 7, { ...household, memberIds: [] })
    ).toEqual([])
  })
})

describe('plannedDeletes and plannedStatusFlips', () => {
  it('reverts each row and shifts each flip by its balance change', () => {
    expect(plannedDeletes([stored()])[0].revert).toBe('30.00')
    expect(plannedStatusFlips([stored()], 'Canceled')[0].shift).toBe('30.00')
    expect(
      plannedStatusFlips([stored({ reviewStatus: 'Canceled' })], 'Checked')[0]
        .shift
    ).toBe('-30.00')
  })
})

describe('withClosedWarning', () => {
  it('warns only when the row landed on a closed bill', () => {
    expect(withClosedWarning({ id: 1 }, true)).toEqual({
      id: 1,
      warning: STATEMENT_CLOSED,
    })
    expect(withClosedWarning({ id: 1 }, false)).toEqual({ id: 1 })
  })
})
