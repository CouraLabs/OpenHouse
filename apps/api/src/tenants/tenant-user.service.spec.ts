import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import type {
  TenantUserRepository,
  TenantUserRow,
} from './tenant-user.repository.js'
import { TenantUserService } from './tenant-user.service.js'

/** A user row the repository can hand back. */
const user = (overrides: Partial<TenantUserRow> = {}): TenantUserRow => ({
  id: 2,
  name: 'Bia',
  email: 'bia@example.com',
  role: 'user',
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

/** A repository mock whose transaction just runs the work. */
const repository = () => ({
  transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) =>
    work({})
  ),
  list: vi.fn(),
  findById: vi.fn(async () => user() as TenantUserRow | undefined),
  lockActiveOwnerIds: vi.fn(async () => [1]),
  setActive: vi.fn(async () => user({ isActive: false })),
})

const service = (repo: ReturnType<typeof repository>) =>
  new TenantUserService(repo as unknown as TenantUserRepository)

describe('TenantUserService.deactivate', () => {
  it('deactivates a member of the tenant', async () => {
    const repo = repository()

    const updated = await service(repo).deactivate(1, 1, 2)

    expect(updated.isActive).toBe(false)
    expect(repo.setActive).toHaveBeenCalledWith(1, 2, false, {})
  })

  it('refuses to remove the acting owner', async () => {
    const repo = repository()

    await expect(service(repo).deactivate(1, 1, 1)).rejects.toThrow(
      ConflictException
    )
    expect(repo.setActive).not.toHaveBeenCalled()
  })

  it('refuses to remove the last active owner', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(user({ id: 3, role: 'owner' }))
    repo.lockActiveOwnerIds.mockResolvedValue([3])

    await expect(service(repo).deactivate(1, 1, 3)).rejects.toThrow(
      ConflictException
    )
    expect(repo.setActive).not.toHaveBeenCalled()
  })

  it('removes an owner while another active owner remains', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(user({ id: 3, role: 'owner' }))
    repo.lockActiveOwnerIds.mockResolvedValue([1, 3])

    await service(repo).deactivate(1, 1, 3)

    expect(repo.setActive).toHaveBeenCalledWith(1, 3, false, {})
  })

  it('answers 404 for a user outside the tenant', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)

    await expect(service(repo).deactivate(1, 1, 9)).rejects.toThrow(
      NotFoundException
    )
  })
})

describe('TenantUserService.reactivate', () => {
  it('reactivates a removed user', async () => {
    const repo = repository()
    repo.setActive.mockResolvedValue(user())

    const updated = await service(repo).reactivate(1, 2)

    expect(updated.isActive).toBe(true)
    expect(repo.setActive).toHaveBeenCalledWith(1, 2, true)
  })

  it('answers 404 for a user outside the tenant', async () => {
    const repo = repository()
    repo.setActive.mockResolvedValue(undefined as never)

    await expect(service(repo).reactivate(1, 9)).rejects.toThrow(
      NotFoundException
    )
  })
})
