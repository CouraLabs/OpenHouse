import { describe, expect, it, vi } from 'vitest'
import type { Category, CategoryRepository } from '@workspace/db'

import { ConflictError, NotFoundError } from '../errors.js'
import type { HouseholdMembers } from '../ports/household-members.js'
import { CategoryService } from './category.service.js'

const row = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  tenantId: 1,
  name: 'Office',
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

const repository = () => ({
  insert: vi.fn(),
  search: vi.fn(),
  listActive: vi.fn(),
  findById: vi.fn(),
  countActiveByName: vi.fn(async () => 0),
  update: vi.fn(),
  softDelete: vi.fn(),
})

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
    ).rejects.toThrow(ConflictError)
    expect(repo.insert).not.toHaveBeenCalled()
  })

  it('maps the unique-index violation of a lost race onto a 409', async () => {
    const repo = repository()
    repo.insert.mockRejectedValue({
      message:
        "UNIQUE constraint failed: index 'categories_tenant_id_name_active_key'",
    })
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(
      service.create(1, 7, { name: 'Office', color: '#1D4ED8' })
    ).rejects.toThrow(ConflictError)
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
    ).rejects.toThrow(NotFoundError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('rejects a read of a category the tenant does not hold', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)
    const service = new CategoryService(
      repo as unknown as CategoryRepository,
      members as unknown as HouseholdMembers
    )

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundError)
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
