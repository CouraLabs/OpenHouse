import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database, NewAuditLogRow } from '@workspace/db'
import { auditLog } from '@workspace/db'

/** The append-only audit log. Rows are inserted and never changed. */
@Injectable()
export class AuditLogRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async insert(row: NewAuditLogRow): Promise<void> {
    await this.db.insert(auditLog).values(row)
  }

  /** The line's insert statement, for the caller's batch. */
  statement(row: NewAuditLogRow) {
    return this.db.insert(auditLog).values(row)
  }
}
