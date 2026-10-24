import { Inject, Injectable, Optional } from '@nestjs/common'
import webpush from 'web-push'

import type { PushConfig } from '../config/env.js'

/** The injection token of the VAPID configuration, `undefined` when push is
 * disabled. */
export const PUSH_CONFIG = Symbol('PUSH_CONFIG')

/** The browser endpoint and keys a message is encrypted for. */
export interface PushTarget {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** A push service refusing a message, with the HTTP status it answered. */
export class PushRejectedError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'PushRejectedError'
  }
}

/** Sends one encrypted message to one push endpoint. Abstract so a spec
 * hands the service a fake; the real one speaks the web push protocol. */
export abstract class PushTransport {
  /** Whether the server holds VAPID keys and can push at all. */
  abstract readonly enabled: boolean

  /** The VAPID public key browsers subscribe against. */
  abstract readonly publicKey: string | null

  /** Delivers a payload; rejects with `PushRejectedError` when the push
   * service answers with an error status. */
  abstract send(target: PushTarget, payload: string): Promise<void>
}

/** The real transport, over the `web-push` library. */
@Injectable()
export class WebPushTransport extends PushTransport {
  readonly enabled: boolean
  readonly publicKey: string | null

  constructor(
    @Optional() @Inject(PUSH_CONFIG) private readonly config?: PushConfig
  ) {
    super()
    this.enabled = config !== undefined
    this.publicKey = config?.publicKey ?? null
  }

  async send(target: PushTarget, payload: string): Promise<void> {
    if (this.config === undefined) {
      throw new Error('Web push is disabled: no VAPID keys are configured.')
    }

    try {
      await webpush.sendNotification(target, payload, {
        TTL: 86_400,
        urgency: 'normal',
        vapidDetails: {
          subject: this.config.subject,
          publicKey: this.config.publicKey,
          privateKey: this.config.privateKey,
        },
      })
    } catch (error) {
      if (error instanceof webpush.WebPushError) {
        throw new PushRejectedError(error.statusCode, error.message)
      }

      throw error
    }
  }
}
