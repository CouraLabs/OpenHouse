import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Category, Receiver } from '@workspace/db'

import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { TransactionLinkerRepository } from './transaction-linker.repository.js'
import { TransactionLinkerService } from './transaction-linker.service.js'

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

/** The receiver the receiver repository finds — ACTIVE unless overridden. */
const receiver = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 5,
  tenantId: 1,
  name: 'Landlord',
  searchName: '',  type: 'Person',
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A linker repository mock with every method the service touches. */
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

/** A receiver repository mock with every method the service touches. */
const receivers = () => ({
  findById: vi.fn(async (): Promise<Receiver | undefined> => receiver()),
})

const service = (repo = repository(), cats = categories(), rcv = receivers()) =>
  new TransactionLinkerService(
    repo as unknown as TransactionLinkerRepository,
    cats as unknown as CategoryRepository,
    rcv as unknown as ReceiverRepository
  )

describe('TransactionLinkerService', () => {
  it('creates a linker with an unset receiver', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue({
      id: 1,
      tenantId: 1,
      description: 'Rent',
      categoryId: 3,
      categoryName: 'Housing',
      receiverId: null,
      receiverName: null,
      status: 'ACTIVE',
      createdDt: new Date(),
      updateDt: new Date(),
    })

    const created = await service(repo).create(1, 7, {
      description: 'Rent',
      categoryId: 3,
      receiverId: null,
    })

    expect(created.categoryName).toBe('Housing')
    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      description: 'Rent',
      categoryId: 3,
      receiverId: null,
    })
  })

  it('creates a linker with a set receiver', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue({
      id: 1,
      tenantId: 1,
      description: 'Rent',
      categoryId: 3,
      categoryName: 'Housing',
      receiverId: 5,
      receiverName: 'Landlord',
      status: 'ACTIVE',
      createdDt: new Date(),
      updateDt: new Date(),
    })

    await service(repo).create(1, 7, {
      description: 'Rent',
      categoryId: 3,
      receiverId: 5,
    })

    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      description: 'Rent',
      categoryId: 3,
      receiverId: 5,
    })
  })

  it('rejects a create whose category the tenant does not hold', async () => {
    const repo = repository()
    const cats = categories()
    cats.findById.mockResolvedValue(undefined)

    await expect(
      service(repo, cats).create(1, 7, {
        description: 'Rent',
        categoryId: 999,
        receiverId: null,
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('rejects a create whose receiver is DELETED', async () => {
    const repo = repository()
    const rcv = receivers()
    rcv.findById.mockResolvedValue(receiver({ status: 'DELETED' }))

    await expect(
      service(repo, categories(), rcv).create(1, 7, {
        description: 'Rent',
        categoryId: 3,
        receiverId: 5,
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('updates an ACTIVE linker', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue({
      id: 1,
      tenantId: 1,
      description: 'Rent',
      categoryId: 3,
      categoryName: 'Housing',
      receiverId: null,
      receiverName: null,
      status: 'ACTIVE',
      createdDt: new Date(),
      updateDt: new Date(),
    })
    repo.update.mockResolvedValue({
      id: 1,
      tenantId: 1,
      description: 'Rent (raised)',
      categoryId: 3,
      categoryName: 'Housing',
      receiverId: null,
      receiverName: null,
      status: 'ACTIVE',
      createdDt: new Date(),
      updateDt: new Date(),
    })

    const updated = await service(repo).update(1, 7, {
      id: 1,
      description: 'Rent (raised)',
      categoryId: 3,
      receiverId: null,
    })

    expect(updated.description).toBe('Rent (raised)')
  })

  it('rejects an update of a linker the tenant does not hold', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)

    await expect(
      service(repo).update(1, 7, {
        id: 999,
        description: 'Rent',
        categoryId: 3,
        receiverId: null,
      })
    ).rejects.toThrow(NotFoundException)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('soft-deletes a linker: a status change, not a row removal', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue({
      id: 1,
      tenantId: 1,
      description: 'Rent',
      categoryId: 3,
      categoryName: 'Housing',
      receiverId: null,
      receiverName: null,
      status: 'ACTIVE',
      createdDt: new Date(),
      updateDt: new Date(),
    })
    repo.softDelete.mockResolvedValue({ id: 1, status: 'DELETED' })

    await service(repo).softDelete(1, 7, 1)

    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})
