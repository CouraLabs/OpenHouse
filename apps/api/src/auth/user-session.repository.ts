import { and, eq, gt } from 'drizzle-orm'
import type { Database, UserSession } from '@workspace/db'
import { userSessions, users } from '@workspace/db'

export class UserSessionRepository {
  constructor(private readonly db: Database) {}

  async find(
    userId: number,
    tokenHash: string,
    now: Date
  ): Promise<UserSession | undefined> {
    const [row] = await this.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.tokenHash, tokenHash),
          gt(userSessions.expiresAt, now)
        )
      )

    return row
  }

  async open(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    keepOthers: boolean
  ): Promise<void> {
    const insert = this.db
      .insert(userSessions)
      .values({ userId, tokenHash, expiresAt })

    if (keepOthers) {
      await insert
      return
    }

    await this.db.batch([
      this.db.delete(userSessions).where(eq(userSessions.userId, userId)),
      insert,
    ])
  }

  async rotate(
    userId: number,
    previousHash: string,
    tokenHash: string,
    expiresAt: Date,
    now: Date
  ): Promise<boolean> {
    const rows = await this.db
      .update(userSessions)
      .set({ tokenHash, expiresAt, lastUsedAt: now })
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.tokenHash, previousHash)
        )
      )
      .returning({ id: userSessions.id })

    return rows.length > 0
  }

  async close(userId: number, tokenHash: string): Promise<void> {
    await this.db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.tokenHash, tokenHash)
        )
      )
  }

  async closeAll(userId: number): Promise<void> {
    await this.db.delete(userSessions).where(eq(userSessions.userId, userId))
  }

  async claimLegacy(userId: number, tokenHash: string): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ refreshTokenHash: null })
      .where(and(eq(users.id, userId), eq(users.refreshTokenHash, tokenHash)))
      .returning({ id: users.id })

    return rows.length > 0
  }
}
