import { Injectable } from '@nestjs/common'

import {
  AuditRecorder,
  type AuditEntry,
} from '../common/audit/audit-recorder.js'
import type { LedgerStatement } from '../common/ledger/ledger-batch.js'
import { AuditLogRepository } from './audit-log.repository.js'

/** Writes the audit log: the implementation behind the `AuditRecorder` port. */
@Injectable()
export class AuditLogService extends AuditRecorder {
  constructor(private readonly log: AuditLogRepository) {
    super()
  }

  statement(entry: AuditEntry): LedgerStatement {
    return this.log.statement({
      tenantId: entry.tenantId,
      actorId: entry.actorId,
      action: entry.action,
      details: entry.details ?? {},
    })
  }

  async record(entry: AuditEntry): Promise<void> {
    await this.log.insert({
      tenantId: entry.tenantId,
      actorId: entry.actorId,
      action: entry.action,
      details: entry.details ?? {},
    })
  }
}
