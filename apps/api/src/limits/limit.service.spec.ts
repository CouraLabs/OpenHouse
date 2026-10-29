import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Category, Limit } from '@workspace/db'

import { CategoryRepository } from '../categories/category.repository.js'
import type { Clock } from '../common/clock/clock.js'
import type { SettingsRepository } from '../settings/settings.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { LimitRepository } from './limit.repository.js'
import { LimitService } from './limit.service.js'

/** A limit row the repository can hand back, with every field the service reads. */
const row = (overrides: Partial<Limit> = {}): Limit => ({
  id: 1,
  tenantId: 1,
  categoryId: 3,
  amount: '12.34',
  type: 'Monthly',
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
  name: 'Office',
  searchName: '',  color: '#1D4ED8',
  defaultSplit: null,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A limit repository mock with every method the service touches. */
const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  findById: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
})

/** A category repository mock with every method the service touches. */
const categories = () => ({
  findById: vi.fn(async (): Promise<Category | undefined> => category()),
})

/** A transaction repository stub — the usage view reads it; these tests
 * never do. */
const transactions = {
  expenseTotalsByCategory: vi.fn(async () => []),
} as unknown as TransactionRepository

/** A settings stub — the tenant keeps its calendar in São Paulo (UTC-3)
 * and its limits in BRL. */
const settings = {
  findByTenant: vi.fn(async () => ({
    timezone: 'America/Sao_Paulo',
    mainCurrency: 'BRL',
  })),
} as unknown as SettingsRepository

/** October 1st, 02:00 UTC — still September 30th in the tenant's zone. */
const clock: Clock = { now: () => new Date('2026-10-01T02:00:00Z') }

describe('LimitService', () => {
  it('creates a limit when the category is usable', async () => {
    const repo = repository()
    const cats = categories()
    repo.insert.mockResolvedValue({ ...row(), categoryName: 'Office' })
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    const created = await service.create(1, 7, {
      categoryId: 3,
      amount: '12.34',
      type: 'Monthly',
    })

    expect(created.categoryName).toBe('Office')
    // The limit stores no currency: the wire reads the main currency.
    expect(created.currency).toBe('BRL')
    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      categoryId: 3,
      amount: '12.34',
      type: 'Monthly',
    })
  })

  it('rejects a create whose category the tenant does not hold', async () => {
    const repo = repository()
    const cats = categories()
    cats.findById.mockResolvedValue(undefined)
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    await expect(
      service.create(1, 7, {
        categoryId: 999,
        amount: '12.34',
        type: 'Monthly',
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects a create whose category is DELETED', async () => {
    const repo = repository()
    const cats = categories()
    cats.findById.mockResolvedValue(category({ status: 'DELETED' }))
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    await expect(
      service.create(1, 7, {
        categoryId: 3,
        amount: '12.34',
        type: 'Monthly',
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('updates an ACTIVE limit', async () => {
    const repo = repository()
    const cats = categories()
    repo.findById.mockResolvedValue({ ...row(), categoryName: 'Office' })
    repo.update.mockResolvedValue({
      ...row({ amount: '99.00' }),
      categoryName: 'Office',
    })
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    const updated = await service.update(1, 7, {
      id: 1,
      categoryId: 3,
      amount: '99.00',
      type: 'Monthly',
    })

    expect(updated.amount).toBe('99.00')
    // Only the writable fields reach the repository: the id selects the row,
    // it is never part of the update — the column is GENERATED ALWAYS.
    expect(repo.update).toHaveBeenCalledWith(1, 1, 7, {
      categoryId: 3,
      amount: '99.00',
      type: 'Monthly',
    })
  })

  it('rejects the update of a deleted limit as missing', async () => {
    const repo = repository()
    const cats = categories()
    repo.findById.mockResolvedValue({
      ...row(),
      status: 'DELETED',
      categoryName: 'Office',
    })
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    await expect(
      service.update(1, 7, {
        id: 1,
        categoryId: 3,
        amount: '99.00',
        type: 'Monthly',
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('rejects a read of a limit the tenant does not hold', async () => {
    const repo = repository()
    const cats = categories()
    repo.findById.mockResolvedValue(undefined)
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundException)
  })

  it('soft-deletes a limit as a status change', async () => {
    const repo = repository()
    const cats = categories()
    repo.findById.mockResolvedValue({ ...row(), categoryName: 'Office' })
    repo.softDelete.mockResolvedValue(row({ status: 'DELETED' }))
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions,
      settings,
      clock
    )

    await expect(service.softDelete(1, 7, 1)).resolves.toBeUndefined()
    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })

  it("totals usage over the period of the tenant's own calendar day", async () => {
    const repo = repository()
    const listActive = vi.fn(async () => [{ ...row(), categoryName: 'Office' }])
    const expenseTotalsByCategory = vi.fn(async () => [
      { categoryId: 3, currency: 'BRL', total: '5.00', count: 1 },
    ])
    const service = new LimitService(
      { ...repo, listActive } as unknown as LimitRepository,
      categories() as unknown as CategoryRepository,
      { expenseTotalsByCategory } as unknown as TransactionRepository,
      settings,
      clock
    )

    const usage = await service.usage(1)

    // The server's UTC day is already October; the tenant's is September.
    expect(expenseTotalsByCategory).toHaveBeenCalledWith(
      1,
      '2026-09-01',
      '2026-09-30'
    )
    expect(usage[0]?.spent).toBe('5.00')
  })

  it('counts only main-currency expenses and reports the others as excluded', async () => {
    const repo = repository()
    const listActive = vi.fn(async () => [{ ...row(), categoryName: 'Office' }])
    const expenseTotalsByCategory = vi.fn(async () => [
      { categoryId: 3, currency: 'BRL', total: '40.00', count: 3 },
      { categoryId: 3, currency: 'USD', total: '15.00', count: 2 },
      { categoryId: 3, currency: 'EUR', total: '9.00', count: 1 },
      { categoryId: 8, currency: 'USD', total: '7.00', count: 4 },
    ])
    const service = new LimitService(
      { ...repo, listActive } as unknown as LimitRepository,
      categories() as unknown as CategoryRepository,
      { expenseTotalsByCategory } as unknown as TransactionRepository,
      settings,
      clock
    )

    const [usage] = await service.usage(1)

    expect(usage?.currency).toBe('BRL')
    expect(usage?.spent).toBe('40.00')
    // Two USD and one EUR expense in the category; category 8 is not its.
    expect(usage?.excludedCount).toBe(3)
  })

  it('keeps the totals of each period apart for limits on one category', async () => {
    const repo = repository()
    const listActive = vi.fn(async () => [
      { ...row({ id: 1, type: 'Monthly' }), categoryName: 'Office' },
      { ...row({ id: 2, type: 'Yearly' }), categoryName: 'Office' },
    ])
    const expenseTotalsByCategory = vi.fn(
      async (_tenantId: number, from: string) => [
        {
          categoryId: 3,
          currency: 'BRL',
          total: from === '2026-09-01' ? '10.00' : '120.00',
          count: 1,
        },
      ]
    )
    const service = new LimitService(
      { ...repo, listActive } as unknown as LimitRepository,
      categories() as unknown as CategoryRepository,
      { expenseTotalsByCategory } as unknown as TransactionRepository,
      settings,
      clock
    )

    const usage = await service.usage(1)

    expect(usage.map((limit) => limit.spent)).toEqual(['10.00', '120.00'])
  })
})
