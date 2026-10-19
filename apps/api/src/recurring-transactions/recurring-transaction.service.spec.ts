import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Account, Category, Receiver } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'
import { RecurringTransactionService } from './recurring-transaction.service.js'

/** The receiver the receiver repository finds — ACTIVE unless overridden. */
const receiver = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 5,
  tenantId: 1,
  name: 'City Power',
  type: 'Service',
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
  name: 'Utilities',
  color: '#1D4ED8',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** The account the account repository finds — ACTIVE unless overridden. */
const account = (overrides: Partial<Account> = {}): Account => ({
  id: 10,
  tenantId: 1,
  name: 'Everyday',
  agency: null,
  number: '123',
  type: 'Checking',
  balance: '100.00',
  currency: 'USD',
  spreadPct: '0.00',
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

/** A rule repository mock with every method the service touches. */
const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
})

/** A rule row the repository hands back. */
const row = {
  id: 1,
  tenantId: 1,
  receiverId: 5,
  categoryId: 3,
  linkedAccountId: 10,
  amount: '99.90',
  type: 'Expense',
  frequency: 'Monthly',
  frequencyDay: 14,
  frequencyMonth: null,
  status: 'ACTIVE' as const,
  receiverName: 'City Power',
  categoryName: 'Utilities',
  accountName: 'Everyday',
  createdBy: 7,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: 7,
  updateDt: new Date('2026-01-01T00:00:00Z'),
}

const createBody = {
  receiverId: 5,
  categoryId: 3,
  linkedAccountId: 10,
  amount: '99.90',
  type: 'Expense' as const,
  frequency: 'Monthly' as const,
  frequencyDay: 14,
  frequencyMonth: null,
}

const service = (
  repo = repository(),
  rcv = receiver(),
  cat = category(),
  acc: Account | Account[] = account()
) =>
  new RecurringTransactionService(
    repo as unknown as RecurringTransactionRepository,
    {
      findById: vi.fn(async (_t: number, id: number) =>
        rcv.id === id ? rcv : undefined
      ),
    } as unknown as ReceiverRepository,
    {
      findById: vi.fn(async (_t: number, id: number) =>
        cat.id === id ? cat : undefined
      ),
    } as unknown as CategoryRepository,
    {
      findById: vi.fn(async (_t: number, id: number) =>
        [acc].flat().find((candidate) => candidate.id === id)
      ),
    } as unknown as AccountRepository
  )

describe('RecurringTransactionService', () => {
  it('creates a rule and maps absent frequency fields to nulls', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(row)
    const svc = service(repo)

    await svc.create(1, 7, createBody)

    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      ...createBody,
      frequencyDay: 14,
      frequencyMonth: null,
    })
  })

  it('rejects a create whose account the tenant does not hold', async () => {
    const repo = repository()

    await expect(
      service(repo, receiver(), category(), account({ id: 999 })).create(
        1,
        7,
        createBody
      )
    ).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects an update of a DELETED rule', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue({ ...row, status: 'DELETED' })

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1 })
    ).rejects.toThrow(NotFoundException)
  })

  it('updates an ACTIVE rule', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row)
    repo.update.mockResolvedValue({ ...row, amount: '109.90' })
    const svc = service(repo)

    const updated = await svc.update(1, 7, {
      ...createBody,
      id: 1,
      amount: '109.90',
    })

    expect(updated.amount).toBe('109.90')
  })

  it('rejects moving a rule to an account of another currency', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row)
    const accounts = [account(), account({ id: 11, currency: 'BRL' })]

    await expect(
      service(repo, receiver(), category(), accounts).update(1, 7, {
        ...createBody,
        id: 1,
        linkedAccountId: 11,
      })
    ).rejects.toThrow(ConflictException)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('moves a rule to another account of the same currency', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row)
    repo.update.mockResolvedValue({ ...row, linkedAccountId: 11 })
    const accounts = [account(), account({ id: 11, name: 'Reserve' })]

    await service(repo, receiver(), category(), accounts).update(1, 7, {
      ...createBody,
      id: 1,
      linkedAccountId: 11,
    })

    expect(repo.update).toHaveBeenCalledWith(
      1,
      1,
      7,
      expect.objectContaining({ linkedAccountId: 11 })
    )
  })

  it('soft-deletes a rule: a status change, not a row removal', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row)
    repo.softDelete.mockResolvedValue({ ...row, status: 'DELETED' })
    const svc = service(repo)

    await svc.softDelete(1, 7, 1)

    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})
