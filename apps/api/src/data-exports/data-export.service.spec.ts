import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { DataExportRepository } from './data-export.repository.js'
import { DataExportService } from './data-export.service.js'

describe('DataExportService', () => {
  let dir: string
  let now: Date
  let service: DataExportService

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'export-spec-'))
    now = new Date('2026-10-23T12:00:00Z')
    const repository = {
      readTenant: async () => ({ accounts: [{ id: 1 }] }),
    } as unknown as DataExportRepository
    const audit = { record: async () => undefined } as AuditRecorder
    const clock = { now: () => now } as Clock
    service = new DataExportService(repository, audit, clock, dir)
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('expires a finished export after 24 hours and deletes its file', async () => {
    const job = await service.create(1, 1, { scope: 'tenant' })
    await service.settled(job.id)

    expect((await service.get(1, job.id)).status).toBe('ready')
    expect(await readdir(dir)).toHaveLength(1)

    now = new Date(now.getTime() + 24 * 3_600_000 + 1)
    await service.sweep()

    expect(await readdir(dir)).toHaveLength(0)
    await expect(service.get(1, job.id)).rejects.toThrow('Export not found')
  })

  it('keeps a ready export just inside its 24 hours', async () => {
    const job = await service.create(1, 1, { scope: 'tenant' })
    await service.settled(job.id)

    now = new Date(now.getTime() + 23 * 3_600_000)
    await service.sweep()

    expect((await service.get(1, job.id)).status).toBe('ready')
  })

  it('clears orphaned files on boot', async () => {
    await writeFile(join(dir, 'orphan.zip'), 'x')
    await service.onModuleInit()

    expect(await readdir(dir)).toHaveLength(0)
  })
})
