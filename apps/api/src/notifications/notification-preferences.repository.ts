import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { notificationPreferences, users } from '@workspace/db'
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from '@workspace/poco'

export interface Recipient {
  tenantId: number
  userId: number
  preferences: NotificationPreferences
}

function toPreferences(
  row: typeof notificationPreferences.$inferSelect
): NotificationPreferences {
  return {
    inAppEnabled: row.inAppEnabled,
    pushEnabled: row.pushEnabled,
    pushDetails: row.pushDetails,
    billLeadDays: row.billLeadDays,
    recurringLeadDays: row.recurringLeadDays,
    limitAlert80: row.limitAlert80,
    limitAlert100: row.limitAlert100,
    delivery: row.delivery,
  }
}

export class NotificationPreferencesRepository {
  constructor(private readonly db: Database) {}

  async find(
    tenantId: number,
    userId: number
  ): Promise<NotificationPreferences> {
    const [row] = await this.db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.tenantId, tenantId),
          eq(notificationPreferences.userId, userId)
        )
      )

    return row === undefined
      ? defaultNotificationPreferences
      : toPreferences(row)
  }

  async save(
    tenantId: number,
    userId: number,
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    const [row] = await this.db
      .insert(notificationPreferences)
      .values({ tenantId, userId, ...preferences })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...preferences, updateDt: new Date() },
      })
      .returning()

    return toPreferences(row)
  }

  async listRecipients(): Promise<Recipient[]> {
    const rows = await this.db
      .select({
        tenantId: users.tenantId,
        userId: users.id,
        preferences: notificationPreferences,
      })
      .from(users)
      .leftJoin(
        notificationPreferences,
        eq(notificationPreferences.userId, users.id)
      )
      .where(eq(users.isActive, true))
      .orderBy(users.tenantId, users.id)

    return rows.map((row) => ({
      tenantId: row.tenantId,
      userId: row.userId,
      preferences:
        row.preferences === null
          ? defaultNotificationPreferences
          : toPreferences(row.preferences),
    }))
  }

  async listRecipientsOfTenant(tenantId: number): Promise<Recipient[]> {
    const rows = await this.db
      .select({
        tenantId: users.tenantId,
        userId: users.id,
        preferences: notificationPreferences,
      })
      .from(users)
      .leftJoin(
        notificationPreferences,
        eq(notificationPreferences.userId, users.id)
      )
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(users.id)

    return rows.map((row) => ({
      tenantId: row.tenantId,
      userId: row.userId,
      preferences:
        row.preferences === null
          ? defaultNotificationPreferences
          : toPreferences(row.preferences),
    }))
  }
}
