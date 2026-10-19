import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Account, Category, Receiver, Transaction } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { TransactionRepository } from './transaction.repository.js'
import { TransactionService } from './transaction.service.js'

/** The account the account repository finds — ACTIVE Checking unless overridden. */
const account = (overrides: Partial<Account> = {}): Account => ({
  id: 10,
  tenantId: 1,
  name: 'Everyday',
  agency: null,
  number: 123,
  type: 'Checking',
  balance: '100.00',
  currency: 'USD',
  limit: null,
  closeDay: null,
  dueDay: null,
  isDefault: false,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The category the category repository finds — ACTIVE unless overridden. */
const category = (overrides: Partial<Category> = {}): Category => ({
  id: 3,
  tenantId: 1,
  name: 'Groceries',
  color: '#1D4ED8',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The receiver the receiver repository finds — ACTIVE unless overridden. */
const receiver = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 5,
  tenantId: 1,
  name: 'Market',
  type: 'Merchant',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A transaction row the repository hands back. */
const row = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  tenantId: 1,
  name: 'Groceries',
  note: null,
  invoice: 'INV-1',
  amount: '12.34',
  transactionDt: '2026-10-14',
  balanceOnDt: '87.66',
  linkedAccountId: 10,
  categoryId: 3,
  receiverId: 5,
  recurringId: null,
  type: 'Expense',
  reviewStatus: 'Verify',
  statusNote: null,
  status: 'ACTIVE',
  transferGroupId: null,
  createdBy: 7,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: 7,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A transaction repository mock with every method the service touches. */
const repository = () => ({
  insertWithBalance: vi.fn(),
  insertTransfer: vi.fn(),
  updateWithBalance: vi.fn(),
  updateStatus: vi.fn(),
  softDeleteWithBalance: vi.fn(),
  search: vi.fn(),
  summary: vi.fn(),
  findById: vi.fn(async (): Promise<Transaction | undefined> => row()),
  findHistory: vi.fn(),
})

/** An account repository mock with every method the service touches. */
const accounts = () => ({
  findById: vi.fn(async (): Promise<Account | undefined> => account()),
})

/** A category repository mock with every method the service touches. */
const categories = () => ({
  findById: vi.fn(async (): Promise<Category | undefined> => category()),
})

/** A receiver repository mock with every method the service touches. */
const receivers = () => ({
  findById: vi.fn(async (): Promise<Receiver | undefined> => receiver()),
})

const service = (
  repo = repository(),
  accs = accounts(),
  cats = categories(),
  rcv = receivers()
) =>
  new TransactionService(
    repo as unknown as TransactionRepository,
    accs as unknown as AccountRepository,
    cats as unknown as CategoryRepository,
    rcv as unknown as ReceiverRepository
  )

const createBody = {
  name: 'Groceries',
  note: null,
  invoice: 'INV-1',
  amount: '12.34',
  transactionDt: '2026-10-14',
  linkedAccountId: 10,
  categoryId: 3,
  receiverId: 5,
  type: 'Expense' as const,
  status: 'Verify' as const,
  statusNote: null,
}

describe('TransactionService', () => {
  it('creates a transaction through the ledger', async () => {
    const repo = repository()
    repo.insertWithBalance.mockResolvedValue(row())
    const svc = service(repo)

    await svc.create(1, 7, createBody)

    // The wire's `status` names out before the spread: the row's lifecycle
    // column is never written from a body.
    const { status: _status, ...bodyRest } = createBody

    expect(repo.insertWithBalance).toHaveBeenCalledWith(1, 7, {
      ...bodyRest,
      recurringId: null,
      reviewStatus: 'Verify',
    })
  })

  it('rejects a create whose account the tenant does not hold', async () => {
    const repo = repository()
    const accs = accounts()
    accs.findById.mockResolvedValue(undefined)

    await expect(
      service(repo, accs).create(1, 7, { ...createBody, linkedAccountId: 999 })
    ).rejects.toThrow(NotFoundException)
    expect(repo.insertWithBalance).not.toHaveBeenCalled()
  })

  it('rejects an update of a DELETED transaction', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1 })
    ).rejects.toThrow(NotFoundException)
  })

  it('changes the status through the narrow route, not the ledger', async () => {
    const repo = repository()
    repo.updateStatus.mockResolvedValue(row({ reviewStatus: 'Checked' }))
    const svc = service(repo)

    const changed = await svc.changeStatus(1, 7, { id: 1, status: 'Checked' })

    expect(changed.reviewStatus).toBe('Checked')
    // Only the status travels: the full-row update path — which reverts and
    // re-applies the same delta — never runs for a review-status change.
    expect(repo.updateStatus).toHaveBeenCalledWith(1, 1, 7, 'Checked')
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it('rejects the status change of a DELETED transaction', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))

    await expect(
      service(repo).changeStatus(1, 7, { id: 1, status: 'Checked' })
    ).rejects.toThrow(NotFoundException)
    expect(repo.updateStatus).not.toHaveBeenCalled()
  })

  it('forwards the session user with the status change', async () => {
    const repo = repository()
    repo.updateStatus.mockResolvedValue(row())
    const svc = service(repo)

    await svc.changeStatus(1, 42, { id: 1, status: 'Canceled' })

    expect(repo.updateStatus).toHaveBeenCalledWith(1, 1, 42, 'Canceled')
  })

  it('updates an ACTIVE transaction, keeping its recurring link', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ recurringId: 9 }))
    repo.updateWithBalance.mockResolvedValue(row({ name: 'Market run' }))
    const svc = service(repo)

    await svc.update(1, 7, { ...createBody, id: 1, name: 'Market run' })

    expect(repo.updateWithBalance).toHaveBeenCalledWith(
      1,
      1,
      7,
      expect.objectContaining({ recurringId: 9, reviewStatus: 'Verify' })
    )
  })

  it("rejects a change to a transfer side's type", async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1, type: 'Income' })
    ).rejects.toThrow(ConflictException)
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it("rejects a change to a transfer side's account", async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1, linkedAccountId: 11 })
    ).rejects.toThrow(ConflictException)
    expect(repo.updateWithBalance).not.toHaveBeenCalled()
  })

  it("updates a transfer side's amount, leaving the pair to the ledger", async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ transferGroupId: 'group-1' }))
    repo.updateWithBalance.mockResolvedValue(row({ amount: '50.00' }))

    await service(repo).update(1, 7, { ...createBody, id: 1, amount: '50.00' })

    expect(repo.updateWithBalance).toHaveBeenCalledWith(
      1,
      1,
      7,
      expect.objectContaining({ amount: '50.00', type: 'Expense' })
    )
  })

  it('soft-deletes an ACTIVE transaction through the ledger', async () => {
    const repo = repository()
    const svc = service(repo)

    await svc.softDelete(1, 7, 1)

    expect(repo.softDeleteWithBalance).toHaveBeenCalledWith(1, 1, 7)
  })

  it('skips the delete of an already-deleted transaction', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))
    const svc = service(repo)

    await svc.softDelete(1, 7, 1)

    expect(repo.softDeleteWithBalance).not.toHaveBeenCalled()
  })

  describe('transfer', () => {
    const transferBody = {
      fromAccountId: 10,
      toAccountId: 11,
      categoryId: 3,
      amount: '50.00',
      transactionDt: '2026-10-14',
      note: null,
    }

    it('creates exactly two rows through one ledger pass', async () => {
      const repo = repository()
      repo.insertTransfer.mockResolvedValue([
        row({
          id: 21,
          name: 'TRANSFER_OUT',
          linkedAccountId: 10,
          type: 'Expense',
        }),
        row({
          id: 22,
          name: 'TRANSFER_IN',
          linkedAccountId: 11,
          type: 'Income',
        }),
      ])
      const accs = accounts()
      accs.findById
        .mockResolvedValueOnce(account())
        .mockResolvedValueOnce(account({ id: 11, name: 'Reserve' }))

      const [out, inn] = await service(repo, accs).transfer(1, 7, transferBody)

      expect(out.type).toBe('Expense')
      expect(inn.type).toBe('Income')
      expect(repo.insertTransfer).toHaveBeenCalledWith(1, 7, transferBody)
    })

    it('rejects accounts of different currencies', async () => {
      const repo = repository()
      const accs = accounts()
      accs.findById
        .mockResolvedValueOnce(account())
        .mockResolvedValueOnce(account({ id: 11, currency: 'BRL' }))

      await expect(
        service(repo, accs).transfer(1, 7, transferBody)
      ).rejects.toThrow(ConflictException)
      expect(repo.insertTransfer).not.toHaveBeenCalled()
    })

    it('rejects the schema-proof second line of defense: the same account twice', async () => {
      const repo = repository()
      const accs = accounts()
      accs.findById.mockResolvedValue(account())

      await expect(
        service(repo, accs).transfer(1, 7, {
          ...transferBody,
          toAccountId: 10,
        })
      ).rejects.toThrow(ConflictException)
    })
  })
})
