import { describe, expect, it, vi } from 'vitest'
import type {
  Account,
  AccountRepository,
  Category,
  CategoryRepository,
  Receiver,
  ReceiverRepository,
  RecurringTransactionRepository,
} from '@workspace/db'

import { BadRequestError, ConflictError, NotFoundError } from '../errors.js'
import type { HouseholdMembers } from '../ports/household-members.js'
import { RecurringTransactionService } from './recurring-transaction.service.js'

const receiver = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 5,
  tenantId: 1,
  name: 'City Power',
  searchName: '',
  type: 'Service',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const category = (overrides: Partial<Category> = {}): Category => ({
  id: 3,
  tenantId: 1,
  name: 'Utilities',
  searchName: '',
  color: '#1D4ED8',
  defaultSplit: null,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 10,
  tenantId: 1,
  name: 'Everyday',
  agency: null,
  number: '123',
  type: 'Checking',
  balance: '100.00',
  openingBalance: '100.00',
  openingDt: '2026-01-01',
  reconciledThrough: null,
  currency: 'USD',
  spreadPct: '0.00',
  limit: null,
  closeDay: null,
  dueDay: null,
  closeDayInclusive: false,
  isDefault: false,
  ownership: 'personal',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
})

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
  paidByUserId: 7,
  paidByName: 'Ana',
  defaultSplit: null,
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
    } as unknown as AccountRepository,
    {
      activeMemberIds: vi.fn(async () => [1, 2, 7]),
    } as unknown as HouseholdMembers
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
      paidByUserId: 7,
      defaultSplit: null,
    })
  })

  it('stores the payer and the default shares the rule carries', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(row)
    const defaultSplit = {
      mode: 'equal' as const,
      entries: [{ userId: 1 }, { userId: 2 }],
    }

    await service(repo).create(1, 7, {
      ...createBody,
      paidByUserId: 2,
      defaultSplit,
    })

    expect(repo.insert).toHaveBeenCalledWith(
      1,
      7,
      expect.objectContaining({ paidByUserId: 2, defaultSplit })
    )
  })

  it('rejects default shares that do not fit the amount, or an income', async () => {
    const repo = repository()
    const exact = {
      mode: 'exact' as const,
      entries: [
        { userId: 1, value: '10.00' },
        { userId: 2, value: '10.00' },
      ],
    }

    await expect(
      service(repo).create(1, 7, { ...createBody, defaultSplit: exact })
    ).rejects.toThrow(BadRequestError)
    await expect(
      service(repo).create(1, 7, {
        ...createBody,
        type: 'Income',
        defaultSplit: { mode: 'equal', entries: [{ userId: 1 }] },
      })
    ).rejects.toThrow(BadRequestError)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects a split naming someone outside the household', async () => {
    await expect(
      service().create(1, 7, {
        ...createBody,
        defaultSplit: { mode: 'equal', entries: [{ userId: 99 }] },
      })
    ).rejects.toThrow(BadRequestError)
  })

  it('rejects a create whose account the tenant does not hold', async () => {
    const repo = repository()

    await expect(
      service(repo, receiver(), category(), account({ id: 999 })).create(
        1,
        7,
        createBody
      )
    ).rejects.toThrow(NotFoundError)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects an update of a DELETED rule', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue({ ...row, status: 'DELETED' })

    await expect(
      service(repo).update(1, 7, { ...createBody, id: 1 })
    ).rejects.toThrow(NotFoundError)
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
    ).rejects.toThrow(ConflictError)
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
