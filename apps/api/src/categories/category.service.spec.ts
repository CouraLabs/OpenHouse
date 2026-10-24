import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { Category } from '@workspace/db'

import { HouseholdMembers } from '../common/household/household-members.js'
import { CategoryRepository } from './category.repository.js'
import { CategoryService } from './category.service.js'

/** A row the repository can hand back, with every field the service reads. */
const row = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  tenantId: 1,
  name: 'Office',
  color: '#1D4ED8',
  defaultSplit: null,
  status: 'ACTIVE',
  createdBy: null,
  createdDt: new Date('2026-01-01T00:00:00Z'),
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A repository mock with every method the service touches. */
const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  listActive: vi.fn(),
  findById: vi.fn(),
  countActiveByName: vi.fn(async () => 0),
  update: vi.fn(),
  softDelete: vi.fn(),
})

/** The household of members 1 and 2. */
const members = { activeMemberIds: vi.fn(async () => [1, 2]) }

describe('CategoryService', () => {
  it('creates a category when the name is free', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(row())
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    const created = await service.create(1, 7, {
      name: 'Office',
      color: '#1D4ED8',
    })

    expect(created.name).toBe('Office')
    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      name: 'Office',
      color: '#1D4ED8',
    })
  })

  it('rejects a create whose name an ACTIVE category already holds', async () => {
    const repo = repository()
    repo.countActiveByName.mockResolvedValue(1)
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(
      service.create(1, 7, { name: 'Office', color: '#1D4ED8' })
    ).rejects.toThrow(ConflictException)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('maps the unique-index violation of a lost race onto a 409', async () => {
    const repo = repository()
    repo.insert.mockRejectedValue({ cause: { code: '23505' } })
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(
      service.create(1, 7, { name: 'Office', color: '#1D4ED8' })
    ).rejects.toThrow(ConflictException)
  })

  it('updates an ACTIVE category', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row())
    repo.update.mockResolvedValue(row({ name: 'Renamed' }))
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    const updated = await service.update(1, 7, {
      id: 1,
      name: 'Renamed',
      color: '#1D4ED8',
    })

    expect(updated.name).toBe('Renamed')
    // Only the writable fields reach the repository: the id selects the row,
    // it is never part of the update — the column is GENERATED ALWAYS.
    expect(repo.update).toHaveBeenCalledWith(1, 1, 7, {
      name: 'Renamed',
      color: '#1D4ED8',
    })
  })

  it('rejects the update of a deleted category as missing', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row({ status: 'DELETED' }))
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(
      service.update(1, 7, { id: 1, name: 'Renamed', color: '#1D4ED8' })
    ).rejects.toThrow(NotFoundException)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('rejects a read of a category the tenant does not hold', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundException)
  })

  it('soft-deletes a category as a status change', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(row())
    repo.softDelete.mockResolvedValue(row({ status: 'DELETED' }))
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(service.softDelete(1, 7, 1)).resolves.toBeUndefined()
    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})
