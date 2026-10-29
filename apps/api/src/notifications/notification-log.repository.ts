import { sql } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import { notificationLog } from '@workspace/db'

import { runBatch, type LedgerStatement } from '../common/ledger/ledger-batch.js'

/** Whether a claim's insert answered the row — the caller won it. */
export function isClaimed(rows: unknown): boolean {
  return Array.isArray(rows) && rows.length > 0
}

/** The kinds the log keys on. */
export type LogKind =
  | 'bill_due'
  | 'bill_overdue'
  | 'recurring_due'
  | 'limit_80'
  | 'limit_100'
  | 'digest'

/** One reminder's identity: who, what, about what, for which day. */
export interface LogKey {
  tenantId: number
  userId: number
  kind: LogKind
  refId: number
  dueDate: string
}

/**
 * The reminder idempotency log. `claim` inserts the key against the unique
 * index `(userId, kind, refId, dueDate)` with `ON CONFLICT DO NOTHING`: the
 * database decides, atomically, who owns a reminder — a restarted process
 * or a second replica inserting the same key gets nothing back and sends
 * nothing. No error is ever caught here.
 */
@Injectable()
export class NotificationLogRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Claims a reminder; answers whether this call won it. */
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

  /**
   * A claim's insert, gated in SQL on the claims it rides on — the shape a
   * digest's item claims take, so a day whose digest was already sent
   * claims nothing.
   */
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

  /** Runs the batch a delivery's claims and entries make. */
  runAll(statements: LedgerStatement[]): Promise<unknown[]> {
    return runBatch(this.db, statements)
  }

  /**
   * The claim's insert statement, for the caller's batch — the claim and
   * the entries it gates commit together, and the claim carries the run's
   * stamp as its `created_at`, so the entries can tell the run that won
   * the claim from a later one reading the same key.
   */
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
