import { Injectable } from '@nestjs/common'
import type { DbOrTx } from '@workspace/db'

import {
  AuditRecorder,
  type AuditEntry,
} from '../common/audit/audit-recorder.js'
import { AuditLogRepository } from './audit-log.repository.js'

/** Writes the audit log: the implementation behind the `AuditRecorder` port. */
@Injectable()
export class AuditLogService extends AuditRecorder {
  constructor(private readonly log: AuditLogRepository) {
    super()
  }

  async record(entry: AuditEntry, tx?: DbOrTx): Promise<void> {
    await this.log.insert(
      {
        tenantId: entry.tenantId,
        actorId: entry.actorId,
        action: entry.action,
        details: entry.details ?? {},
      },
      tx
    )
  }
}
