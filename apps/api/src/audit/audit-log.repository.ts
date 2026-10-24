import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database, DbOrTx, NewAuditLogRow } from '@workspace/db'
import { auditLog } from '@workspace/db'

/** The append-only audit log. Rows are inserted and never changed. */
@Injectable()
export class AuditLogRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async insert(row: NewAuditLogRow, tx: DbOrTx = this.db): Promise<void> {
    await tx.insert(auditLog).values(row)
  }
}
