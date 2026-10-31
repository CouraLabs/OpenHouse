import { and, eq } from 'drizzle-orm'
import type { PushSubscriptionBody } from '@workspace/domain'
import type { Database } from '../../database.js'
import { pushSubscriptions, type PushSubscriptionRow } from '../../schema.js'

export class PushSubscriptionRepository {
  constructor(private readonly db: Database) {}

  async upsert(
    tenantId: number,
    userId: number,
    subscription: PushSubscriptionBody,
    userAgent: string | null
  ): Promise<void> {
    const row = {
      tenantId,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    }

    await this.db
      .insert(pushSubscriptions)
      .values(row)
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { ...row, createdAt: new Date() },
      })
  }

  listByUser(userId: number): Promise<PushSubscriptionRow[]> {
    return this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
  }

  async deleteForUser(userId: number, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint)
        )
      )
  }

  async deleteById(id: number): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))
  }
}
