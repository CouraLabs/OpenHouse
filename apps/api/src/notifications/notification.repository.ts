import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, count, desc, eq, isNull } from 'drizzle-orm'
import type { Database, DbOrTx } from '@workspace/db'
import { notifications } from '@workspace/db'
import type { AppNotification, NotificationBody } from '@workspace/poco'

/** How many entries the notification centre lists. */
export const CENTRE_PAGE_SIZE = 30

/** The notification centre entries of the users, reached by user. */
@Injectable()
export class NotificationRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Adds an entry to a user's centre. */
  async insert(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    body: NotificationBody
  ): Promise<void> {
    await tx.insert(notifications).values({
      tenantId,
      userId,
      // The column is untyped JSON (the db package knows no wire types).
      body: body as unknown as Record<string, unknown>,
    })
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
