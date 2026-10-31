import type { AuditLogRepository } from '@workspace/db'
import type { LedgerStatement } from '../ledger/ledger-batch.js'
import { AuditRecorder, type AuditEntry } from '../ports/audit-recorder.js'

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
