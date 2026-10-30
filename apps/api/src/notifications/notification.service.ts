import type { NotificationList, NotificationPreferences } from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import { NotificationPreferencesRepository } from './notification-preferences.repository.js'
import { NotificationRepository } from './notification.repository.js'

export class NotificationService {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly preferences: NotificationPreferencesRepository,
    private readonly clock: Clock
  ) {}

  async list(userId: number): Promise<NotificationList> {
    const [items, unread] = await Promise.all([
      this.notifications.latest(userId),
      this.notifications.unreadCount(userId),
    ])

    return { items, unread }
  }

  markRead(userId: number, id: number): Promise<void> {
    return this.notifications.markRead(userId, id, this.clock.now())
  }

  markAllRead(userId: number): Promise<void> {
    return this.notifications.markAllRead(userId, this.clock.now())
  }

  getPreferences(
    tenantId: number,
    userId: number
  ): Promise<NotificationPreferences> {
    return this.preferences.find(tenantId, userId)
  }

  savePreferences(
    tenantId: number,
    userId: number,
    body: NotificationPreferences
  ): Promise<NotificationPreferences> {
    return this.preferences.save(tenantId, userId, body)
  }
}
