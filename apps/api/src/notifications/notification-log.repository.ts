import { sql } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { notificationLog } from '@workspace/db'

import { runBatch, type LedgerStatement } from '../common/ledger/ledger-batch.js'

export function isClaimed(rows: unknown): boolean {
  return Array.isArray(rows) && rows.length > 0
}

export type LogKind =
  | 'bill_due'
  | 'bill_overdue'
  | 'recurring_due'
  | 'limit_80'
  | 'limit_100'
  | 'digest'

export interface LogKey {
  tenantId: number
  userId: number
  kind: LogKind
  refId: number
  dueDate: string
}

export class NotificationLogRepository {
  constructor(private readonly db: Database) {}

  async claim(key: LogKey): Promise<boolean> {
    return isClaimed(await this.db
      .insert(notificationLog)
      .values(key)
      .onConflictDoNothing({
        target: [
          notificationLog.userId,
          notificationLog.kind,
          notificationLog.refId,
          notificationLog.dueDate,
        ],
      })
      .returning({ id: notificationLog.id }))
  }

  gatedClaimStatement(
    key: LogKey & { stamp?: Date },
    gates: Array<LogKey & { stamp?: Date }>
  ): LedgerStatement {
    const stands = [key, ...gates].map(
      (gated) =>
        sql`exists (select 1 from ${notificationLog} where ${notificationLog.userId} = ${gated.userId} and ${notificationLog.kind} = ${gated.kind} and ${notificationLog.refId} = ${gated.refId} and ${notificationLog.dueDate} = ${gated.dueDate})`
    )

    return this.db.insert(notificationLog).select(
      sql`select null as id, ${key.userId} as user_id, ${key.tenantId} as tenant_id, ${key.kind} as kind, ${key.refId} as ref_id, ${key.dueDate} as due_date, ${key.stamp?.getTime() ?? Date.now()} as created_at where ${sql.join(stands, sql` and `)}`
    )
  }

  runAll(statements: LedgerStatement[]): Promise<unknown[]> {
    return runBatch(this.db, statements)
  }

  claimStatement(key: LogKey & { stamp?: Date }) {
    return this.db
      .insert(notificationLog)
      .values({ ...key, createdAt: key.stamp ?? new Date() })
      .onConflictDoNothing({
        target: [
          notificationLog.userId,
          notificationLog.kind,
          notificationLog.refId,
          notificationLog.dueDate,
        ],
      })
      .returning({ id: notificationLog.id })
  }
}
