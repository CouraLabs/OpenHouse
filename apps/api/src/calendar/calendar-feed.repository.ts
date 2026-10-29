import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { calendarFeeds, users } from '@workspace/db'

/** The tenant and user a feed token belongs to. */
export interface FeedOwner {
  tenantId: number
  userId: number
}

/** The secret calendar feed tokens, one per user. */
export class CalendarFeedRepository {
  constructor(private readonly db: Database) {}

  /** Reads the user's token, or nothing while no feed was created. */
  async findToken(userId: number): Promise<string | undefined> {
    const [row] = await this.db
      .select({ token: calendarFeeds.token })
      .from(calendarFeeds)
      .where(eq(calendarFeeds.userId, userId))

    return row?.token
  }

  /** Creates the user's feed or replaces its token (the old URL stops
   * working). */
  async save(tenantId: number, userId: number, token: string): Promise<void> {
    await this.db
      .insert(calendarFeeds)
      .values({ tenantId, userId, token })
      .onConflictDoUpdate({
        target: calendarFeeds.userId,
        set: { token, createdAt: new Date() },
      })
  }

  /** Deletes the user's feed. */
  async remove(userId: number): Promise<void> {
    await this.db.delete(calendarFeeds).where(eq(calendarFeeds.userId, userId))
  }

  /** Resolves a token to its owner — only while the user is active. */
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
