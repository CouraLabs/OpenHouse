import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Account, Category, Receiver, Transaction } from '@workspace/db'
import type { ImportCommitBody, ImportCommitRow } from '@workspace/poco'

import type { AccountRepository } from '../accounts/account.repository.js'
import type { CategoryRepository } from '../categories/category.repository.js'
import type { Clock } from '../common/clock/clock.js'
import type { ReceiverRepository } from '../receivers/receiver.repository.js'
import type { TransactionRepository } from '../transactions/transaction.repository.js'
import { chunk } from './chunk.js'
import { ImportCommitService } from './import-commit.service.js'
import type { ImportMappingRepository } from './import-mapping.repository.js'
import type { ImportTransactionRepository } from './import-transaction.repository.js'

vi.mock('./chunk.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('./chunk.js')>()

  return { chunk: vi.fn(original.chunk) }
})

const NOW = new Date('2026-01-20T12:00:00Z')
const HOUR = 60 * 60 * 1000

const account = (overrides: Partial<Account> = {}): Account =>
  ({
    id: 10,
    tenantId: 1,
    type: 'Checking',
    currency: 'BRL',
    reconciledThrough: null,
    closeDay: null,
    dueDay: null,
    closeDayInclusive: false,
    status: 'ACTIVE',
    ...overrides,
  }) as Account

const card = () => account({ type: 'Credit Card', closeDay: 5, dueDay: 15 })

const row = (overrides: Partial<ImportCommitRow> = {}): ImportCommitRow => ({
  name: 'Mercado',
  amount: '10.00',
  type: 'Expense',
  transactionDt: '2026-01-05',
  categoryId: 3,
  status: 'Checked',
  ...overrides,
})

/** The service with every collaborator mocked; `tx` is the handle the one
 * ledger transaction passes down. */
function setup(options: { account?: Account; existing?: string[] } = {}) {
  const tx = { handle: 'tx' }
  const calls: string[] = []
  const transactions = {
    inLedgerTx: vi.fn(async (run: (tx: unknown) => Promise<unknown>) => {
      calls.push('begin')
      return run(tx)
    }),
    lockAccountsInTx: vi.fn(async () => {
      calls.push('lock')
    }),
    insertInTx: vi.fn(async () => {
      calls.push('insert')
    }),
    softDeleteInTx: vi.fn(async () => {
      calls.push('delete')
    }),
  }
  const imports = {
    findByExternalIds: vi.fn(
      async () => new Map((options.existing ?? []).map((id) => [id, { id: 1 }]))
    ),
    lockBatch: vi.fn(),
    recentBatches: vi.fn(),
  }
  const mappings = { save: vi.fn() }
  const accounts = { findById: vi.fn(async () => options.account ?? account()) }
  const categories = {
    listActive: vi.fn(async () => [{ id: 3 } as Category]),
  }
  const receivers = { listActive: vi.fn(async () => [{ id: 5 } as Receiver]) }
  const clock = { now: () => NOW } as Clock
  const service = new ImportCommitService(
    transactions as unknown as TransactionRepository,
    imports as unknown as ImportTransactionRepository,
    mappings as unknown as ImportMappingRepository,
    accounts as unknown as AccountRepository,
    categories as unknown as CategoryRepository,
    receivers as unknown as ReceiverRepository,
    clock
  )

  return { service, transactions, imports, mappings, tx, calls }
}

const body = (rows: ImportCommitRow[], extra: Partial<ImportCommitBody> = {}) =>
  ({ accountId: 10, rows, ...extra }) as ImportCommitBody

describe('ImportCommitService.commit', () => {
  it('writes everything in one ledger transaction under one account lock', async () => {
    const { service, transactions, calls } = setup()

    const result = await service.commit(
      1,
      7,
      body([row({ externalId: 'a' }), row({ externalId: 'b' }), row()])
    )

    expect(transactions.inLedgerTx).toHaveBeenCalledTimes(1)
    expect(transactions.lockAccountsInTx).toHaveBeenCalledTimes(1)
    expect(transactions.lockAccountsInTx).toHaveBeenCalledWith(
      expect.anything(),
      1,
      [10]
    )
    expect(calls).toEqual(['begin', 'lock', 'insert', 'insert', 'insert'])
    expect(result).toMatchObject({ imported: 3, skippedDuplicates: 0 })
    expect(result.batchId).toEqual(expect.any(String))
    expect(result.undoUntil).toBe(
      new Date(NOW.getTime() + 24 * HOUR).toISOString()
    )
  })

  it('inserts through insertInTx with the batch id and bank id on every row', async () => {
    const { service, transactions, tx } = setup()

    const result = await service.commit(
      1,
      7,
      body([row({ externalId: 'a', receiverId: null, note: 'n' })])
    )

    expect(transactions.insertInTx).toHaveBeenCalledWith(
      tx,
      1,
      7,
      {
        name: 'Mercado',
        note: 'n',
        invoice: null,
        amount: '10.00',
        transactionDt: '2026-01-05',
        linkedAccountId: 10,
        categoryId: 3,
        receiverId: null,
        recurringId: null,
        type: 'Expense',
        reviewStatus: 'Checked',
        statusNote: null,
        importBatchId: result.batchId,
        externalId: 'a',
      },
      { readBack: false }
    )
  })

  it('writes oldest day first', async () => {
    const { service, transactions } = setup()

    await service.commit(
      1,
      7,
      body([
        row({ name: 'c', transactionDt: '2026-01-09' }),
        row({ name: 'a', transactionDt: '2026-01-02' }),
        row({ name: 'b', transactionDt: '2026-01-02' }),
      ])
    )

    const names = transactions.insertInTx.mock.calls.map(
      (call) =>
        (call as unknown as [unknown, unknown, unknown, { name: string }])[3]
          .name
    )

    expect(names).toEqual(['a', 'b', 'c'])
  })

  it('inserts a 5,000-row file in one transaction with one lock, in 500-row chunks', async () => {
    const { service, transactions } = setup()
    const rows = Array.from({ length: 5000 }, (_, index) =>
      row({ externalId: `fit-${index}` })
    )

    const result = await service.commit(1, 7, body(rows))

    expect(result.imported).toBe(5000)
    expect(chunk).toHaveBeenCalledWith(expect.any(Array), 500)
    expect(transactions.insertInTx).toHaveBeenCalledTimes(5000)
    expect(transactions.inLedgerTx).toHaveBeenCalledTimes(1)
    expect(transactions.lockAccountsInTx).toHaveBeenCalledTimes(1)
  })

  it('skips rows whose bank id is already on an ACTIVE row, and repeats in the file', async () => {
    const { service, transactions } = setup({ existing: ['old'] })

    const result = await service.commit(
      1,
      7,
      body([
        row({ externalId: 'old' }),
        row({ externalId: 'new' }),
        row({ externalId: 'new' }),
        row({ externalId: null }),
      ])
    )

    expect(result).toMatchObject({ imported: 2, skippedDuplicates: 2 })
    expect(transactions.insertInTx).toHaveBeenCalledTimes(2)
  })

  it('answers no batch when every row was a duplicate', async () => {
    const { service } = setup({ existing: ['old'] })

    expect(
      await service.commit(1, 7, body([row({ externalId: 'old' })]))
    ).toEqual({
      batchId: null,
      imported: 0,
      skippedDuplicates: 1,
      undoUntil: null,
    })
  })

  it('rolls the whole file back when one row fails', async () => {
    const { service, transactions } = setup()

    transactions.insertInTx
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'))

    await expect(service.commit(1, 7, body([row(), row()]))).rejects.toThrow(
      'boom'
    )
  })

  it('saves the CSV mapping with the rows, in the same transaction', async () => {
    const { service, mappings, tx } = setup()
    const mapping = {
      hasHeader: true,
    } as unknown as ImportCommitBody['mapping']

    await service.commit(1, 7, body([row()], { mapping }))

    expect(mappings.save).toHaveBeenCalledWith(tx, 1, 7, 10, mapping)
  })

  it('links installments into one group placed on their own day’s bill', async () => {
    const { service, transactions } = setup({ account: card() })

    await service.commit(
      1,
      7,
      body([
        row({
          name: 'LOJA X PARC 03/10',
          installment: { number: 3, count: 10 },
        }),
        row({
          name: 'LOJA X PARC 04/10',
          transactionDt: '2026-02-05',
          installment: { number: 4, count: 10 },
        }),
      ])
    )

    const writes = transactions.insertInTx.mock.calls.map(
      (call) =>
        (
          call as unknown as [
            unknown,
            unknown,
            unknown,
            { installment: Record<string, unknown> },
          ]
        )[3].installment
    )

    expect(writes[0].groupId).toBe(writes[1].groupId)
    expect(
      writes.map((write) => [write.number, write.count, write.billOffset])
    ).toEqual([
      [3, 10, 0],
      [4, 10, 0],
    ])
  })

  it('refuses installments off a credit card', async () => {
    const { service, transactions } = setup()

    await expect(
      service.commit(
        1,
        7,
        body([row({ installment: { number: 3, count: 10 } })])
      )
    ).rejects.toBeInstanceOf(ConflictException)
    expect(transactions.inLedgerTx).not.toHaveBeenCalled()
  })

  it('asks before importing into a reconciled period', async () => {
    const { service, transactions } = setup({
      account: account({ reconciledThrough: '2026-01-05' }),
    })

    await expect(service.commit(1, 7, body([row()]))).rejects.toMatchObject({
      response: { reconciledThrough: '2026-01-05' },
    })
    expect(transactions.inLedgerTx).not.toHaveBeenCalled()

    await service.commit(1, 7, body([row()], { confirmReconciled: true }))

    expect(transactions.insertInTx).toHaveBeenCalledTimes(1)
  })

  it('refuses a category or receiver the tenant cannot use', async () => {
    const { service, transactions } = setup()

    await expect(
      service.commit(1, 7, body([row({ categoryId: 99 })]))
    ).rejects.toBeInstanceOf(NotFoundException)
    await expect(
      service.commit(1, 7, body([row({ receiverId: 99 })]))
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(transactions.inLedgerTx).not.toHaveBeenCalled()
  })
})

describe('ImportCommitService.undo', () => {
  const stored = (id: number) =>
    ({ id, linkedAccountId: 10 }) as unknown as Transaction

  it('soft-deletes every live row of the batch within 24 hours', async () => {
    const { service, imports, transactions, calls } = setup()

    imports.lockBatch.mockResolvedValue({
      rows: [stored(1), stored(2)],
      importedAt: new Date(NOW.getTime() - 23 * HOUR),
    })

    expect(await service.undo(1, 7, 'batch')).toEqual({ undone: 2 })
    expect(transactions.softDeleteInTx).toHaveBeenCalledTimes(2)
    expect(calls).toEqual(['begin', 'lock', 'delete', 'delete'])
  })

  it('refuses once the 24 hours have passed', async () => {
    const { service, imports, transactions } = setup()

    imports.lockBatch.mockResolvedValue({
      rows: [stored(1)],
      importedAt: new Date(NOW.getTime() - 25 * HOUR),
    })

    await expect(service.undo(1, 7, 'batch')).rejects.toBeInstanceOf(
      ConflictException
    )
    expect(transactions.softDeleteInTx).not.toHaveBeenCalled()
  })

  it('answers 404 for a batch the tenant never wrote', async () => {
    const { service, imports } = setup()

    imports.lockBatch.mockResolvedValue(undefined)

    await expect(service.undo(1, 7, 'batch')).rejects.toBeInstanceOf(
      NotFoundException
    )
  })
})

describe('ImportCommitService.recent', () => {
  it('lists the batches of the last 24 hours with their undo deadline', async () => {
    const { service, imports } = setup()
    const importedAt = new Date(NOW.getTime() - 2 * HOUR)

    imports.recentBatches.mockResolvedValue([
      { batchId: 'b', count: 4, importedAt },
    ])

    expect(await service.recent(1, 10)).toEqual([
      {
        batchId: 'b',
        accountId: 10,
        count: 4,
        importedAt: importedAt.toISOString(),
        undoUntil: new Date(importedAt.getTime() + 24 * HOUR).toISOString(),
      },
    ])
    expect(imports.recentBatches).toHaveBeenCalledWith(
      1,
      10,
      new Date(NOW.getTime() - 24 * HOUR)
    )
  })
})
