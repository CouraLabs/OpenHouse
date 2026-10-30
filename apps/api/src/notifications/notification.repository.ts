import { and, count, desc, eq, isNull, sql } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { notificationLog, notifications } from '@workspace/db'
import type { AppNotification, NotificationBody } from '@workspace/poco'

export const CENTRE_PAGE_SIZE = 30

export class NotificationRepository {
  constructor(private readonly db: Database) {}

  async insert(
    tenantId: number,
    userId: number,
    body: NotificationBody
  ): Promise<void> {
    await this.db.insert(notifications).values({
      tenantId,
      userId,
      body: body as unknown as Record<string, unknown>,
    })
  }

  insertStatement(
    tenantId: number,
    userId: number,
    body: NotificationBody,
    gates: Array<{
      userId: number
      kind: string
      refId: number
      dueDate: string
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

  async unreadCount(userId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt))
      )

    return row.value
  }

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

  async markAllRead(userId: number, now: Date): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt))
      )
  }
}
