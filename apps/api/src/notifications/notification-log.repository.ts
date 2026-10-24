import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database, DbOrTx } from '@workspace/db'
import { notificationLog } from '@workspace/db'

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

  /** Runs `work` in one transaction, so a claim and its in-app entry
   * commit together. */
  transaction<T>(work: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return this.db.transaction(work)
  }

  /** Claims a reminder; answers whether this call won it. */
  async claim(key: LogKey, tx: DbOrTx = this.db): Promise<boolean> {
    const claimed = await tx
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
      .returning({ id: notificationLog.id })

    return claimed.length > 0
  }
}
