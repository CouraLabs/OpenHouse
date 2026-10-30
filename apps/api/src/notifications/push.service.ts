import type {
  NotificationBody,
  PushConfig,
  PushSubscriptionBody,
} from '@workspace/poco'

import { buildPushPayload } from './push-payload.js'
import { PushRejectedError, PushTransport } from './push-transport.js'
import { PushSubscriptionRepository } from './push-subscription.repository.js'

const GONE_STATUSES = new Set([404, 410])

export class PushService {

  constructor(
    private readonly subscriptions: PushSubscriptionRepository,
    private readonly transport: PushTransport
  ) {}

  config(): PushConfig {
    return {
      enabled: this.transport.enabled,
      publicKey: this.transport.publicKey,
    }
  }

  subscribe(
    tenantId: number,
    userId: number,
    subscription: PushSubscriptionBody,
    userAgent: string | null
  ): Promise<void> {
    return this.subscriptions.upsert(tenantId, userId, subscription, userAgent)
  }

  unsubscribe(userId: number, endpoint: string): Promise<void> {
    return this.subscriptions.deleteForUser(userId, endpoint)
  }

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
          console.warn(
            `A push to subscription ${subscription.id} failed: ${String(error)}`
          )
        }
      }
    }

    return delivered
  }

  async hasSubscriptions(userId: number): Promise<boolean> {
    return (await this.subscriptions.listByUser(userId)).length > 0
  }
}
