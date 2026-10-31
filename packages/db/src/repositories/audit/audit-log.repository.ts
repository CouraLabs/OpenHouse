import type { Database } from '../../database.js'
import { auditLog, type NewAuditLogRow } from '../../schema.js'

export class AuditLogRepository {
  constructor(private readonly db: Database) {}

  async insert(row: NewAuditLogRow): Promise<void> {
    await this.db.insert(auditLog).values(row)
  }

  statement(row: NewAuditLogRow) {
    return this.db.insert(auditLog).values(row)
  }
}
