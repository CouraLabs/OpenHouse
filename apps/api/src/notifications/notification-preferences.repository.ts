import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { notificationPreferences, users } from '@workspace/db'
import {
  defaultNotificationPreferences,
  type NotificationPreferences,
} from '@workspace/poco'

/** A user the reminders can reach, with the preferences that apply. */
export interface Recipient {
  tenantId: number
  userId: number
  preferences: NotificationPreferences
}

/** The preference columns a row carries, as the wire shape. */
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

/**
 * The per-user reminder preferences. A user who never saved any has no row
 * and gets poco's defaults, so nothing needs seeding at sign-up.
 */
@Injectable()
export class NotificationPreferencesRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Reads a user's preferences, the defaults when none were saved. */
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

  /** Saves a user's preferences, creating the row the first time. */
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

  /** Lists every active, non-anonymized user with their preferences — who
   * the hourly reminder run evaluates. */
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
}
