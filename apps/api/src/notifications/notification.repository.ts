import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { notificationLog, notifications } from '@workspace/db'
import type { AppNotification, NotificationBody } from '@workspace/poco'

/** How many entries the notification centre lists. */
export const CENTRE_PAGE_SIZE = 30

/** The notification centre entries of the users, reached by user. */
@Injectable()
export class NotificationRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Adds an entry to a user's centre. */
  async insert(
    tenantId: number,
    userId: number,
    body: NotificationBody
  ): Promise<void> {
    await this.db.insert(notifications).values({
      tenantId,
      userId,
      // The column is untyped JSON (the db package knows no wire types).
      body: body as unknown as Record<string, unknown>,
    })
  }

  /**
   * The entry's insert statement, gated in SQL on the claims it rides on —
   * an entry is stored only when every claim it needs was won, and only by
   * the run that won them.
   */
  insertStatement(
    tenantId: number,
    userId: number,
    body: NotificationBody,
    gates: Array<{
      userId: number
      kind: string
      refId: number
      dueDate: string
      /** The stamp of the run that won the claim — an entry is inserted
       * only by the run that won it, never by a later run reading the
       * same key. */
      stamp: Date
    }>
  ) {
    const gate = sql.join(
      gates.map(
        (key) =>
          sql`exists (select 1 from ${notificationLog} where ${notificationLog.userId} = ${key.userId} and ${notificationLog.kind} = ${key.kind} and ${notificationLog.refId} = ${key.refId} and ${notificationLog.dueDate} = ${key.dueDate} and ${notificationLog.createdAt} = ${key.stamp.getTime()})`
      ),
      sql` and `
    )

    return this.db.insert(notifications).select(
      sql`select null as id, ${tenantId} as tenant_id, ${userId} as user_id, ${JSON.stringify(body)} as body, (cast(unixepoch('subsec') * 1000 as integer)) as created_at, null as read_at where ${gate}`
    )
  }

  /** A user's latest entries, newest first. */
  async latest(userId: number): Promise<AppNotification[]> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.id))
      .limit(CENTRE_PAGE_SIZE)

    return rows.map((row) => ({
      id: row.id,
      body: row.body as unknown as NotificationBody,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt === null ? null : row.readAt.toISOString(),
    }))
  }

  /** How many entries of the user are unread. */
  async unreadCount(userId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt))
      )

    return row.value
  }

  /** Marks one of the user's entries read; a no-op when already read. */
  async markRead(userId: number, id: number, now: Date): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.id, id),
          isNull(notifications.readAt)
        )
      )
  }

  /** Marks every unread entry of the user read. */
  async markAllRead(userId: number, now: Date): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt))
      )
  }
}
