import { randomUUID } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import {
  EXPORT_TTL_HOURS,
  type CreateDataExportBody,
  type DataExportJob,
  type DataExportStatus,
} from '@workspace/poco'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { DataExportRepository } from './data-export.repository.js'
import { buildExportZip } from './export-zip.js'

/** Token for the folder the ZIPs are written to, read from `config/`. */
export const EXPORT_DIR = Symbol('EXPORT_DIR')

/** A job the process remembers. Jobs live in memory: the API has no queue,
 * and a restart forgets them and clears their files. */
interface Job {
  id: string
  tenantId: number
  scope: 'tenant' | 'member'
  userId: number | null
  status: DataExportStatus
  sizeBytes: number | null
  createdAt: Date
  expiresAt: Date
  /** Settles when the job stops being pending — specs await it. */
  done: Promise<void>
}

/**
 * The full-export jobs. An owner creates a job, an in-process task reads the
 * data and writes the ZIP into `EXPORT_DIR`, the Settings page polls the job
 * and downloads it. The file is deleted after the first successful download
 * or once it is 24 hours old, whichever comes first; nothing is emailed.
 * Jobs are scoped to the tenant of the session that created them.
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name)
  private readonly jobs = new Map<string, Job>()

  constructor(
    private readonly repository: DataExportRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock,
    @Inject(EXPORT_DIR) private readonly dir: string
  ) {}

  /** A restart forgot every job, so any file left in the folder is an
   * orphan nobody can download: clear them. */
  async onModuleInit(): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    for (const name of await readdir(this.dir)) {
      await rm(join(this.dir, name), { force: true })
    }
  }

  /** Starts a job and answers it pending; the work continues in the
   * background. A member export of a user outside the tenant answers 404. */
  async create(
    tenantId: number,
    actorId: number,
    body: CreateDataExportBody
  ): Promise<DataExportJob> {
    const userId = body.scope === 'member' ? body.userId : null
    const exportedAt = this.clock.now()
    const job: Job = {
      id: randomUUID(),
      tenantId,
      scope: body.scope,
      userId,
      status: 'pending',
      sizeBytes: null,
      createdAt: exportedAt,
      expiresAt: new Date(exportedAt.getTime() + EXPORT_TTL_HOURS * 3_600_000),
      done: Promise.resolve(),
    }

    if (userId !== null) {
      if (!(await this.repository.hasUser(tenantId, userId))) {
        throw new NotFoundException('User not found.')
      }
    }

    await this.audit.record({
      tenantId,
      actorId,
      action: userId === null ? 'tenant.export' : 'member.export',
      details: userId === null ? {} : { userId },
    })
    this.jobs.set(job.id, job)
    job.done = this.run(job, exportedAt)

    return toWire(job)
  }

  /** Reads a job of the tenant; an expired or unknown one answers 404. */
  async get(tenantId: number, id: string): Promise<DataExportJob> {
    return toWire(await this.find(tenantId, id))
  }

  /** Streams the ZIP of a ready job, then deletes it: a download is
   * single-use. */
  async download(tenantId: number, id: string): Promise<StreamableFile> {
    const job = await this.find(tenantId, id)
    if (job.status !== 'ready') {
      throw new NotFoundException('The export is not ready.')
    }

    const stream = createReadStream(this.pathOf(job))
    stream.once('end', () => void this.discard(job))

    return new StreamableFile(stream, {
      type: 'application/zip',
      disposition: `attachment; filename="openhouse-export-${job.id}.zip"`,
      length: job.sizeBytes ?? undefined,
    })
  }

  /** Waits for a job to stop being pending (for specs). */
  async settled(id: string): Promise<void> {
    await this.jobs.get(id)?.done
  }

  /** Deletes every export older than its 24 hours. */
  @Cron('0 */10 * * * *')
  async sweep(): Promise<void> {
    const now = this.clock.now()
    for (const job of [...this.jobs.values()]) {
      if (job.status !== 'pending' && job.expiresAt <= now) {
        await this.discard(job)
      }
    }
  }

  private async find(tenantId: number, id: string): Promise<Job> {
    const job = this.jobs.get(id)
    if (job === undefined || job.tenantId !== tenantId) {
      throw new NotFoundException('Export not found.')
    }
    if (job.status !== 'pending' && job.expiresAt <= this.clock.now()) {
      await this.discard(job)
      throw new NotFoundException('Export not found.')
    }

    return job
  }

  private async run(job: Job, exportedAt: Date): Promise<void> {
    try {
      const files =
        job.userId === null
          ? await this.repository.readTenant(job.tenantId)
          : await this.repository.readMember(job.tenantId, job.userId)
      if (files === undefined) {
        throw new Error('The member to export is gone.')
      }

      const zip = buildExportZip(files, {
        scope: job.scope,
        tenantId: job.tenantId,
        userId: job.userId,
        exportedAt,
      })
      await writeFile(this.pathOf(job), zip)
      job.sizeBytes = (await stat(this.pathOf(job))).size
      job.status = 'ready'
    } catch (error) {
      this.logger.error(`Export ${job.id} failed.`, error)
      job.status = 'failed'
    }
  }

  private async discard(job: Job): Promise<void> {
    this.jobs.delete(job.id)
    await rm(this.pathOf(job), { force: true })
  }

  private pathOf(job: Job): string {
    return join(this.dir, `${job.id}.zip`)
  }
}

function toWire(job: Job): DataExportJob {
  return {
    id: job.id,
    scope: job.scope,
    userId: job.userId,
    status: job.status,
    sizeBytes: job.sizeBytes,
    createdAt: job.createdAt.toISOString(),
    expiresAt: job.expiresAt.toISOString(),
  }
}
