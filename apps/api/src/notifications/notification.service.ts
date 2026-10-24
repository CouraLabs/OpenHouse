import { Injectable } from '@nestjs/common'
import type { NotificationList, NotificationPreferences } from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import { NotificationPreferencesRepository } from './notification-preferences.repository.js'
import { NotificationRepository } from './notification.repository.js'

/** The notification centre and the reminder preferences of the signed-in
 * user. Every method names the user: a user only ever reaches their own. */
@Injectable()
export class NotificationService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly preferences: NotificationPreferencesRepository,
    private readonly clock: Clock
  ) {}

  /** The latest entries and the unread count. */
  async list(userId: number): Promise<NotificationList> {
    const [items, unread] = await Promise.all([
      this.notifications.latest(userId),
      this.notifications.unreadCount(userId),
    ])

    return { items, unread }
  }

  /** Marks one entry read. */
  markRead(userId: number, id: number): Promise<void> {
    return this.notifications.markRead(userId, id, this.clock.now())
  }

  /** Marks every entry read. */
  markAllRead(userId: number): Promise<void> {
    return this.notifications.markAllRead(userId, this.clock.now())
  }

  /** The user's preferences, the defaults until they save any. */
  getPreferences(
    tenantId: number,
    userId: number
  ): Promise<NotificationPreferences> {
    return this.preferences.find(tenantId, userId)
  }

  /** Saves the user's preferences. */
  savePreferences(
    tenantId: number,
    userId: number,
    body: NotificationPreferences
  ): Promise<NotificationPreferences> {
    return this.preferences.save(tenantId, userId, body)
  }
}
