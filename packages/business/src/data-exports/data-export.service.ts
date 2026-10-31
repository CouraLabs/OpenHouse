import type { DataExportRepository } from '@workspace/db'
import type { CreateDataExportBody } from '@workspace/dto'

import { NotFoundError } from '../errors.js'
import type { AuditRecorder } from '../ports/audit-recorder.js'
import type { Clock } from '../ports/clock.js'
import { buildExportZip } from './export-zip.js'

export interface ExportedZip {
  bytes: Uint8Array
  fileName: string
}

export class DataExportService {
  constructor(
    private readonly repository: DataExportRepository,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock
  ) {}

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
      fileName: `kantim-export-${tenantId}-${await this.todayOf(
        tenantId
      )}.zip`,
    }
  }

  private async todayOf(tenantId: number): Promise<string> {
    const timezone = await this.repository.timezoneOf(tenantId)

    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
      this.clock.now()
    )
  }
}
