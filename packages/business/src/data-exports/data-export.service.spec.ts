import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import type { DataExportRepository } from '@workspace/db'
import type { ExportManifest } from '@workspace/dto'

import { NotFoundError } from '../errors.js'
import type { AuditEntry, AuditRecorder } from '../ports/audit-recorder.js'
import type { Clock } from '../ports/clock.js'
import { DataExportService } from './data-export.service.js'

const NOW = new Date('2026-10-23T12:00:00Z')

describe('DataExportService.export', () => {
  function setup(
    options: {
      memberExists?: boolean
      memberRows?: Record<string, unknown[]> | undefined
    } = {}
  ) {
    const entries: AuditEntry[] = []
    const repository = {
      readTenant: vi.fn(async () => ({ accounts: [{ id: 1 }, { id: 2 }] })),
      readMember: vi.fn(async () => options.memberRows ?? { goals: [] }),
      hasUser: vi.fn(async () => options.memberExists ?? true),
      timezoneOf: vi.fn(async () => 'America/Sao_Paulo'),
    } as unknown as DataExportRepository
    const audit = {
      record: vi.fn(async (entry: AuditEntry) => {
        entries.push(entry)
      }),
      statement: () => undefined as never,
    } as AuditRecorder
    const clock = { now: () => NOW } as Clock
    const service = new DataExportService(repository, audit, clock)

    return { service, repository, entries }
  }

  it('answers the tenant ZIP in one request, with the audit line', async () => {
    const { service, repository, entries } = setup()

    const { bytes, fileName } = await service.export(1, 7, { scope: 'tenant' })

    expect(repository.readTenant).toHaveBeenCalledWith(1)
    expect(entries).toEqual([
      {
        tenantId: 1,
        actorId: 7,
        action: 'tenant.export',
        details: {},
      },
    ])
    expect(fileName).toBe('kantim-export-1-2026-10-23.zip')

    const files = unzipSync(bytes)
    const manifest = JSON.parse(
      strFromU8(files['manifest.json'])
    ) as ExportManifest

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      exportedAt: '2026-10-23T12:00:00.000Z',
      scope: 'tenant',
      tenantId: 1,
      userId: null,
      files: [{ name: 'accounts.json', rows: 2 }],
    })
    expect(JSON.parse(strFromU8(files['accounts.json']))).toEqual([
      { id: 1 },
      { id: 2 },
    ])
  })

  it("dates the file name in the tenant's time zone", async () => {
    const { service } = setup()

    const { fileName } = await service.export(1, 7, { scope: 'tenant' })

    expect(fileName).toBe('kantim-export-1-2026-10-23.zip')
  })

  it("exports a member's rows through the member read, with its audit line", async () => {
    const { service, repository, entries } = setup()

    const { bytes } = await service.export(1, 7, {
      scope: 'member',
      userId: 4,
    })

    expect(repository.hasUser).toHaveBeenCalledWith(1, 4)
    expect(repository.readMember).toHaveBeenCalledWith(1, 4)
    expect(entries[0]).toMatchObject({
      tenantId: 1,
      actorId: 7,
      action: 'member.export',
      details: { userId: 4 },
    })

    const files = unzipSync(bytes)

    expect(JSON.parse(strFromU8(files['manifest.json']))).toMatchObject({
      scope: 'member',
      userId: 4,
    })
  })

  it('answers 404 for a member outside the tenant, and records nothing', async () => {
    const { service, entries } = setup({ memberExists: false })

    await expect(
      service.export(1, 7, { scope: 'member', userId: 99 })
    ).rejects.toBeInstanceOf(NotFoundError)
    expect(entries).toEqual([])
  })
})
