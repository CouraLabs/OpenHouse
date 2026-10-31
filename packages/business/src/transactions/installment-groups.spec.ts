import { describe, expect, it, vi } from 'vitest'
import {
  type InstallmentRepository,
  type InstallmentState,
  LedgerBatchPlan,
  type Transaction,
  type TransactionRow,
} from '@workspace/db'

import { InstallmentGroups } from './installment-groups.js'

const part = (id: number, overrides: Partial<Transaction> = {}): Transaction =>
  ({
    id,
    tenantId: 1,
    name: 'Laptop',
    note: null,
    invoice: null,
    amount: '100.00',
    transactionDt: '2026-09-10',
    linkedAccountId: 9,
    categoryId: 3,
    receiverId: null,
    type: 'Expense',
    reviewStatus: 'Verify',
    statusNote: null,
    paidByUserId: 7,
    installmentGroupId: 'g',
    installmentNumber: id,
    installmentCount: 3,
    statementId: 40 + id,
    ...overrides,
  }) as Transaction

const rows = [part(1), part(2), part(3)]

const states = (closeDates: string[]): InstallmentState[] =>
  rows.map((row, index) => ({
    id: row.id,
    amount: row.amount,
    installmentNumber: row.installmentNumber ?? 0,
    closeDate: closeDates[index],
  }))

function groups(closeDates = ['2026-09-25', '2026-10-25', '2026-11-25']) {
  const repository = {
    readGroup: vi.fn(async () => ({ rows, states: states(closeDates) })),
    sharesTotalOf: vi.fn(async () => []),
    planRewrite: vi.fn(() => new LedgerBatchPlan()),
    statesOf: vi.fn(),
    findActiveRow: vi.fn(),
  }
  const transactions = {
    findInstallments: vi.fn(async () => rows as TransactionRow[]),
    planInsert: vi.fn(async () => ({
      plan: new LedgerBatchPlan(),
      insertIndex: 0,
    })),
    planSoftDelete: vi.fn(() => new LedgerBatchPlan()),
    planReplaceSplits: vi.fn(() => new LedgerBatchPlan()),
    readInsertedRow: vi.fn(async () => ({ id: 99 }) as TransactionRow),
    run: vi.fn(async () => []),
  }
  const planner = { insert: vi.fn(async () => ({}) as never) }

  return {
    repository,
    transactions,
    planner,
    service: new InstallmentGroups(
      repository as unknown as InstallmentRepository,
      transactions,
      planner
    ),
  }
}

describe('InstallmentGroups.delete', () => {
  it('refuses to delete a purchase that was partly billed', async () => {
    const { service, transactions } = groups()

    await expect(
      service.delete(1, 7, 'g', 'all', '2026-10-01')
    ).resolves.toEqual({ kind: 'billed' })
    expect(transactions.run).not.toHaveBeenCalled()
  })

  it('deletes only the installments whose bill is still open', async () => {
    const { service, transactions } = groups()

    await expect(
      service.delete(1, 7, 'g', 'remaining', '2026-10-01')
    ).resolves.toEqual({ kind: 'done', value: 2 })
    expect(
      transactions.planSoftDelete.mock.calls.map((call) => [
        (call as unknown[])[2],
        (call as unknown[])[3],
      ])
    ).toEqual([
      [rows[1], '100.00'],
      [rows[2], '100.00'],
    ])
  })
})

describe('InstallmentGroups.refund', () => {
  it('refunds what was already billed, dated today', async () => {
    const { service, planner } = groups()

    await service.refund(1, 7, 'g', 'Laptop refund', '2026-10-01')

    expect(planner.insert).toHaveBeenCalledWith(
      1,
      7,
      expect.objectContaining({
        name: 'Laptop refund',
        type: 'Income',
        amount: '100.00',
        transactionDt: '2026-10-01',
      })
    )
  })

  it('writes no refund when nothing was billed', async () => {
    const { service, planner } = groups([
      '2026-10-25',
      '2026-11-25',
      '2026-12-25',
    ])

    await expect(
      service.refund(1, 7, 'g', 'Laptop refund', '2026-10-01')
    ).resolves.toEqual({ kind: 'done', value: null })
    expect(planner.insert).not.toHaveBeenCalled()
  })
})

describe('InstallmentGroups.update', () => {
  const meta = { name: 'Laptop', note: null, categoryId: 3, receiverId: null }

  it('refuses new amounts once an installment was billed', async () => {
    const { service } = groups()

    await expect(
      service.update(1, 7, 'g', meta, ['150.00', '75.00', '75.00'], '2026-10-01')
    ).resolves.toEqual({ kind: 'billed' })
  })

  it('still renames a billed purchase, moving no balance', async () => {
    const { service, repository } = groups()

    await expect(
      service.update(
        1,
        7,
        'g',
        { ...meta, name: 'Notebook' },
        ['100.00', '100.00', '100.00'],
        '2026-10-01'
      )
    ).resolves.toMatchObject({ kind: 'done' })
    expect(repository.planRewrite).toHaveBeenCalledTimes(3)
    expect(
      repository.planRewrite.mock.calls.map((call) => (call as unknown[])[4])
    ).toEqual(['0.00', '0.00', '0.00'])
  })
})
