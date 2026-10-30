import type { Database, NewAuditLogRow } from '@workspace/db'
import { auditLog } from '@workspace/db'

export class AuditLogRepository {
  constructor(private readonly db: Database) {}

  async insert(row: NewAuditLogRow): Promise<void> {
    await this.db.insert(auditLog).values(row)
  }

  statement(row: NewAuditLogRow) {
    return this.db.insert(auditLog).values(row)
  }
}
