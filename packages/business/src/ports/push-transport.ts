export interface PushTarget {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export class PushRejectedError extends Error {
  constructor(
    readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'PushRejectedError'
  }
}

export abstract class PushTransport {
  abstract readonly enabled: boolean

  abstract readonly publicKey: string | null

  abstract send(target: PushTarget, payload: string): Promise<void>
}
