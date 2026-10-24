import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, eq } from 'drizzle-orm'
import type { Database, PushSubscriptionRow } from '@workspace/db'
import { pushSubscriptions } from '@workspace/db'
import type { PushSubscriptionBody } from '@workspace/poco'

/** The push subscriptions: one row per browser or device endpoint. */
@Injectable()
export class PushSubscriptionRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Stores a browser's subscription. An endpoint is one browser, so
   * subscribing again (maybe as another user of a shared browser) replaces
   * the row. */
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

  /** A user's subscriptions. */
  listByUser(userId: number): Promise<PushSubscriptionRow[]> {
    return this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
  }

  /** Removes one of the user's subscriptions by endpoint. */
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

  /** Removes a subscription by id — a push service said it is gone. */
  async deleteById(id: number): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id))
  }
}
