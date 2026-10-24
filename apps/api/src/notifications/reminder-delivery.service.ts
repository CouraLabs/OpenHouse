import { Injectable } from '@nestjs/common'
import type { NotificationBody, ReminderDetail } from '@workspace/poco'

import { NotificationLogRepository } from './notification-log.repository.js'
import { NotificationRepository } from './notification.repository.js'
import type { Recipient } from './notification-preferences.repository.js'
import { PushService } from './push.service.js'
import type { ReminderCandidate } from './reminder-rules.js'

/** Thrown inside the claim transaction to roll it back: this user's digest
 * for the day already went out. */
class DigestAlreadySent extends Error {}

/**
 * Delivers the reminders due for one user, exactly once. Every reminder is
 * first claimed in the `notification_log` — the unique index on `(userId,
 * kind, refId, dueDate)` makes the claim atomic across restarts and
 * replicas — and only the claims this call won are stored in the
 * notification centre and pushed. The claims and the centre entries commit
 * in one transaction, so a reminder is never logged without being stored.
 *
 * A digest user gets at most one digest a day: the day's digest is itself a
 * claim, and a second run that day rolls its item claims back, leaving the
 * items for the next day's digest.
 */
@Injectable()
export class ReminderDeliveryService {
  constructor(
    private readonly log: NotificationLogRepository,
    private readonly notifications: NotificationRepository,
    private readonly push: PushService
  ) {}

  /** Delivers what is due; answers how many messages were stored or pushed. */
  async deliver(
    recipient: Recipient,
    candidates: readonly ReminderCandidate[],
    today: string
  ): Promise<number> {
    const { tenantId, userId, preferences } = recipient

    if (candidates.length === 0) {
      return 0
    }

    // A reminder with nowhere to go is not claimed: enabling a channel
    // later must not wake up days of stale ones.
    const pushable =
      preferences.pushEnabled &&
      this.push.config().enabled &&
      (await this.push.hasSubscriptions(userId))

    if (!preferences.inAppEnabled && !pushable) {
      return 0
    }

    let bodies: NotificationBody[]

    try {
      bodies = await this.log.transaction(async (tx) => {
        const won: ReminderDetail[] = []

        for (const candidate of candidates) {
          if (
            await this.log.claim({ tenantId, userId, ...candidate.key }, tx)
          ) {
            won.push(candidate.detail)
          }
        }

        if (won.length === 0) {
          return []
        }

        const stored: NotificationBody[] =
          preferences.delivery === 'digest'
            ? [{ kind: 'digest', items: won }]
            : won

        if (
          preferences.delivery === 'digest' &&
          !(await this.log.claim(
            { tenantId, userId, kind: 'digest', refId: 0, dueDate: today },
            tx
          ))
        ) {
          throw new DigestAlreadySent()
        }

        if (preferences.inAppEnabled) {
          for (const body of stored) {
            await this.notifications.insert(tx, tenantId, userId, body)
          }
        }

        return stored
      })
    } catch (error) {
      if (error instanceof DigestAlreadySent) {
        return 0
      }

      throw error
    }

    if (pushable && bodies.length > 0) {
      await this.push.notify(userId, bodies, preferences.pushDetails)
    }

    return bodies.length
  }
}
