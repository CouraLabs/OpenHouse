import {
  type CreateDataExportBody,
} from '@workspace/poco'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { Clock } from '../common/clock/clock.js'
import { NotFoundError } from '../common/errors.js'
import { DataExportRepository } from './data-export.repository.js'
import { buildExportZip } from './export-zip.js'

/** The ZIP the export route answers with. */
export interface ExportedZip {
  bytes: Uint8Array
  /** The file name the response's `Content-Disposition` carries. */
  fileName: string
}

/**
 * The full export, in one request: the owner asks, the service reads the
 * tenant's tables, the ZIP is built in memory, the export is recorded in
 * the audit log, and the bytes answer the same request — nothing is stored
 * on disk and no job is polled.
 */
export class DataExportService {
  constructor(
    private readonly repository: DataExportRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock
  ) {}

  /** Reads, packs, and records the export. A member export of a user
   * outside the tenant answers 404. */
  async export(
    tenantId: number,
    actorId: number,
    body: CreateDataExportBody
  ): Promise<ExportedZip> {
    const userId = body.scope === 'member' ? body.userId : null

    if (userId !== null && !(await this.repository.hasUser(tenantId, userId))) {
      throw new NotFoundError('User not found.')
    }

    const exportedAt = this.clock.now()
    const files =
      userId === null
        ? await this.repository.readTenant(tenantId)
        : await this.repository.readMember(tenantId, userId)

    if (files === undefined) {
      throw new NotFoundError('User not found.')
    }

    const zip = buildExportZip(files, {
      scope: body.scope,
      tenantId,
      userId,
      exportedAt,
    })

    await this.audit.record({
      tenantId,
      actorId,
      action: userId === null ? 'tenant.export' : 'member.export',
      details: userId === null ? {} : { userId },
    })

    return {
      bytes: zip,
      fileName: `openhouse-export-${tenantId}-${await this.todayOf(
        tenantId
      )}.zip`,
    }
  }

  /** Today in the tenant's time zone, as `YYYY-MM-DD`. */
  private async todayOf(tenantId: number): Promise<string> {
    const timezone = await this.repository.timezoneOf(tenantId)

    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
      this.clock.now()
    )
  }
}
