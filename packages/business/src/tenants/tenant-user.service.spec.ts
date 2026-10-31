import { describe, expect, it, vi } from 'vitest'
import type { TenantUserRepository, TenantUserRow } from '@workspace/db'

import { ConflictError, NotFoundError } from '../errors.js'
import type { AuditRecorder } from '../ports/audit-recorder.js'
import { TenantUserService } from './tenant-user.service.js'

const user = (overrides: Partial<TenantUserRow> = {}): TenantUserRow => ({
  id: 2,
  name: 'Bia',
  email: 'bia@example.com',
  role: 'user',
  isActive: true,
  anonymizedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
})

const repository = () => ({
  list: vi.fn(),
  findById: vi.fn(async () => user() as TenantUserRow | undefined),
  deactivate: vi.fn(async () => user({ isActive: false })),
  setActive: vi.fn(async () => user({ isActive: false })),
  anonymizeWithAudit: vi.fn(
    async (
      _tenantId: number,
      _id: number,
      identity: { name: string; email: string }
    ) => user({ ...identity, isActive: false, anonymizedAt: NOW })
  ),
})

const NOW = new Date('2026-10-23T12:00:00Z')

const auditRecorder = () => ({
  record: vi.fn(async () => undefined),
  statement: vi.fn(() => ({ audit: true })),
})

const service = (
  repo: ReturnType<typeof repository>,
  audit: ReturnType<typeof auditRecorder> = auditRecorder()
) =>
  new TenantUserService(
    repo as unknown as TenantUserRepository,
    audit as unknown as AuditRecorder,
    { now: () => NOW }
  )

describe('TenantUserService.deactivate', () => {
  it('deactivates a member of the tenant', async () => {
    const repo = repository()

    const updated = await service(repo).deactivate(1, 1, 2)

    expect(updated.isActive).toBe(false)
    expect(repo.deactivate).toHaveBeenCalledWith(1, 2)
  })

  it('refuses to remove the acting owner', async () => {
    const repo = repository()

    await expect(service(repo).deactivate(1, 1, 1)).rejects.toThrow(
      ConflictError
    )
    expect(repo.setActive).not.toHaveBeenCalled()
  })

  it('refuses to remove the last active owner — the guard matched nothing', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(user({ id: 3, role: 'owner' }))
    repo.deactivate.mockResolvedValue(undefined as never)

    await expect(service(repo).deactivate(1, 1, 3)).rejects.toThrow(
      ConflictError
    )
  })

  it('removes an owner while another active owner remains', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(user({ id: 3, role: 'owner' }))

    await service(repo).deactivate(1, 1, 3)

    expect(repo.deactivate).toHaveBeenCalledWith(1, 3)
  })

  it('answers 404 for a user outside the tenant', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)

    await expect(service(repo).deactivate(1, 1, 9)).rejects.toThrow(
      NotFoundError
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
      NotFoundError
    )
  })
})

describe('TenantUserService.anonymize', () => {
  it('replaces the identity of a removed member and records it', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(user({ isActive: false }))
    const audit = auditRecorder()

    const updated = await service(repo, audit).anonymize(1, 1, 2)

    expect(updated.name).toBe('Former member')
    expect(updated.email).toMatch(
      /^former-member-[0-9a-f-]{36}@anonymized\.invalid$/
    )
    expect(updated.email).not.toContain('bia')
    expect(updated.anonymizedAt).toEqual(NOW)
    expect(repo.anonymizeWithAudit).toHaveBeenCalledWith(
      1,
      2,
      { name: 'Former member', email: updated.email },
      NOW,
      expect.anything()
    )
    expect(audit.statement).toHaveBeenCalledWith({
      tenantId: 1,
      actorId: 1,
      action: 'member.anonymize',
      details: { userId: 2 },
    })
  })

  it('refuses a member who is still active', async () => {
    const repo = repository()

    await expect(service(repo).anonymize(1, 1, 2)).rejects.toThrow(
      ConflictError
    )
    expect(repo.anonymizeWithAudit).not.toHaveBeenCalled()
  })

  it('changes nothing for a member already anonymized', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(
      user({ isActive: false, anonymizedAt: NOW, name: 'Former member' })
    )

    await service(repo).anonymize(1, 1, 2)

    expect(repo.anonymizeWithAudit).not.toHaveBeenCalled()
  })

  it('answers 404 for a user outside the tenant', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(undefined)

    await expect(service(repo).anonymize(1, 1, 9)).rejects.toThrow(
      NotFoundError
    )
  })

  it('does not restore an anonymized member', async () => {
    const repo = repository()
    repo.findById.mockResolvedValue(
      user({ isActive: false, anonymizedAt: NOW })
    )

    await expect(service(repo).reactivate(1, 2)).rejects.toThrow(
      ConflictError
    )
    expect(repo.setActive).not.toHaveBeenCalled()
  })
})
