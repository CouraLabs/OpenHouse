import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { calendarFeeds, users } from '@workspace/db'

export interface FeedOwner {
  tenantId: number
  userId: number
}

export class CalendarFeedRepository {
  constructor(private readonly db: Database) {}

  async findToken(userId: number): Promise<string | undefined> {
    const [row] = await this.db
      .select({ token: calendarFeeds.token })
      .from(calendarFeeds)
      .where(eq(calendarFeeds.userId, userId))

    return row?.token
  }

  async save(tenantId: number, userId: number, token: string): Promise<void> {
    await this.db
      .insert(calendarFeeds)
      .values({ tenantId, userId, token })
      .onConflictDoUpdate({
        target: calendarFeeds.userId,
        set: { token, createdAt: new Date() },
      })
  }

  async remove(userId: number): Promise<void> {
    await this.db.delete(calendarFeeds).where(eq(calendarFeeds.userId, userId))
  }

  async findOwner(token: string): Promise<FeedOwner | undefined> {
    const [row] = await this.db
      .select({
        tenantId: calendarFeeds.tenantId,
        userId: calendarFeeds.userId,
      })
      .from(calendarFeeds)
      .innerJoin(users, eq(users.id, calendarFeeds.userId))
      .where(and(eq(calendarFeeds.token, token), eq(users.isActive, true)))

    return row
  }
}
