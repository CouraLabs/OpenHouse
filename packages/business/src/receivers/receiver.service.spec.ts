import { describe, expect, it, vi } from 'vitest'
import type { Receiver, ReceiverRepository } from '@workspace/db'

import { NotFoundError } from '../errors.js'
import { ReceiverService } from './receiver.service.js'

const row = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 1,
  tenantId: 1,
  name: 'Landlord',
  searchName: '',
  type: 'Person',
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
  findById: vi.fn(async (): Promise<Receiver | undefined> => row()),
  update: vi.fn(),
  softDelete: vi.fn(),
  listActive: vi.fn(async (): Promise<Receiver[]> => []),
})

describe('ReceiverService', () => {
  it('creates a receiver and maps the body straight through', async () => {
    const repo = repository()
    repo.insert.mockResolvedValue(row())
    const service = new ReceiverService(repo as unknown as ReceiverRepository)

    const created = await service.create(1, 7, {
      name: 'Landlord',
      type: 'Person',
    })

    expect(created.name).toBe('Landlord')
    expect(repo.insert).toHaveBeenCalledWith(1, 7, {
      name: 'Landlord',
      type: 'Person',
    })
  })

  it('lists ACTIVE receivers as refs, by name', async () => {
    const repo = repository()
    repo.listActive.mockResolvedValue([
      row({ id: 2, name: 'City Power', type: 'Service' }),
    ])
    const service = new ReceiverService(repo as unknown as ReceiverRepository)

    const refs = await service.listActive(1)

    expect(refs).toEqual([{ id: 2, name: 'City Power', type: 'Service' }])
  })

  it('rejects a read of a receiver the tenant does not hold', async () => {
    const repo = repository()
    repo.findById = vi.fn(async () => undefined)
    const service = new ReceiverService(repo as unknown as ReceiverRepository)

    await expect(service.find(1, 999)).rejects.toThrow(NotFoundError)
  })

  it('updates an ACTIVE receiver', async () => {
    const repo = repository()
    repo.update.mockResolvedValue(row({ name: 'Landlord Jr.' }))
    const service = new ReceiverService(repo as unknown as ReceiverRepository)

    const updated = await service.update(1, 7, {
      id: 1,
      name: 'Landlord Jr.',
      type: 'Person',
    })

    expect(updated.name).toBe('Landlord Jr.')
  })

  it('rejects an update of a receiver the tenant does not hold', async () => {
    const repo = repository()
    repo.findById = vi.fn(async () => undefined)
    const service = new ReceiverService(repo as unknown as ReceiverRepository)

    await expect(
      service.update(1, 7, { id: 999, name: 'X', type: 'Person' })
    ).rejects.toThrow(NotFoundError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('soft-deletes an ACTIVE receiver: a status change, not a row removal', async () => {
    const repo = repository()
    repo.softDelete.mockResolvedValue(row({ status: 'DELETED' }))
    const service = new ReceiverService(repo as unknown as ReceiverRepository)

    await service.softDelete(1, 7, 1)

    expect(repo.softDelete).toHaveBeenCalledWith(1, 1, 7)
  })
})
