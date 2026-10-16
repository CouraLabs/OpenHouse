import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Category, Limit } from '@workspace/db'

import { CategoryRepository } from '../categories/category.repository.js'
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
  currency: 'USD',
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
  color: '#1D4ED8',
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

describe('LimitService', () => {
  it('creates a limit when the category is usable', async () => {
    const repo = repository()
    const cats = categories()
    repo.insert.mockResolvedValue({ ...row(), categoryName: 'Office' })
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions
    )

    const created = await service.create(1, 7, {
      categoryId: 3,
      amount: '12.34',
      type: 'Monthly',
      currency: 'USD',
    })

    expect(created.categoryName).toBe('Office')
    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      categoryId: 3,
      amount: '12.34',
      type: 'Monthly',
      currency: 'USD',
    })
  })

  it('rejects a create whose category the tenant does not hold', async () => {
    const repo = repository()
    const cats = categories()
    cats.findById.mockResolvedValue(undefined)
    const service = new LimitService(
      repo as unknown as LimitRepository,
      cats as unknown as CategoryRepository,
      transactions
    )

    await expect(
      service.create(1, 7, {
        categoryId: 999,
        amount: '12.34',
        type: 'Monthly',
        currency: 'USD',
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
      transactions
    )

    await expect(
      service.create(1, 7, {
        categoryId: 3,
        amount: '12.34',
        type: 'Monthly',
        currency: 'USD',
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
      transactions
    )

    const updated = await service.update(1, 7, {
      id: 1,
      categoryId: 3,
      amount: '99.00',
      type: 'Monthly',
      currency: 'USD',
    })

    expect(updated.amount).toBe('99.00')
    // Only the writable fields reach the repository: the id selects the row,
    // it is never part of the update — the column is GENERATED ALWAYS.
    expect(repo.update).toHaveBeenCalledWith(1, 1, 7, {
      categoryId: 3,
      amount: '99.00',
      type: 'Monthly',
      currency: 'USD',
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
      transactions
    )

    await expect(
      service.update(1, 7, {
        id: 1,
        categoryId: 3,
        amount: '99.00',
        type: 'Monthly',
        currency: 'USD',
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
      transactions
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
      transactions
    )

    await expect(service.softDelete(1, 7, 1)).resolves.toBeUndefined()
    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})
