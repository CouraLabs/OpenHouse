import { Injectable, Logger } from '@nestjs/common'
import type {
  NotificationBody,
  PushConfig,
  PushSubscriptionBody,
} from '@workspace/poco'

import { buildPushPayload } from './push-payload.js'
import { PushRejectedError, PushTransport } from './push-transport.js'
import { PushSubscriptionRepository } from './push-subscription.repository.js'

/** The statuses a push service answers for a subscription that is gone. */
const GONE_STATUSES = new Set([404, 410])

/**
 * Web push: stores the browsers a user subscribed from and sends them
 * messages. A push service answering 404 or 410 means the subscription is
 * dead (the user revoked it, or the browser profile is gone) and its row is
 * deleted; any other failure is logged and the row kept for the next try.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly transport: PushTransport
  ) {}

  /** Whether the server can push, and the key to subscribe against. */
  config(): PushConfig {
    return {
      enabled: this.transport.enabled,
      publicKey: this.transport.publicKey,
    }
  }

  /** Stores a browser's subscription for the user. */
  subscribe(
    tenantId: number,
    userId: number,
    subscription: PushSubscriptionBody,
    userAgent: string | null
  ): Promise<void> {
    return this.subscriptions.upsert(tenantId, userId, subscription, userAgent)
  }

  /** Removes a browser's subscription of the user. */
  unsubscribe(userId: number, endpoint: string): Promise<void> {
    return this.subscriptions.deleteForUser(userId, endpoint)
  }

  /**
   * Pushes the reminders to every subscribed browser of the user, quietly
   * unless `includeDetails`. Answers how many browsers took the message.
   * Never throws: a failing push must not undo the reminder that was
   * already stored in the notification centre.
   */
  async notify(
    userId: number,
    bodies: readonly NotificationBody[],
    includeDetails: boolean
  ): Promise<number> {
    if (!this.transport.enabled || bodies.length === 0) {
      return 0
    }

    const payload = JSON.stringify(buildPushPayload(bodies, includeDetails))
    let delivered = 0

    for (const subscription of await this.subscriptions.listByUser(userId)) {
      try {
        await this.transport.send(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payload
        )
        delivered += 1
      } catch (error) {
        if (
          error instanceof PushRejectedError &&
          GONE_STATUSES.has(error.statusCode)
        ) {
          await this.subscriptions.deleteById(subscription.id)
        } else {
          this.logger.warn(
            `A push to subscription ${subscription.id} failed: ${String(error)}`
          )
        }
      }
    }

    return delivered
  }

  /** Whether the user has any subscribed browser. */
  async hasSubscriptions(userId: number): Promise<boolean> {
    return (await this.subscriptions.listByUser(userId)).length > 0
  }
}
