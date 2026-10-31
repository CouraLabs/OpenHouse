export abstract class DomainError extends Error {
  abstract readonly status: 400 | 401 | 403 | 404 | 409 | 429

  abstract readonly payload: unknown

  constructor(cause?: unknown) {
    super()
    if (cause !== undefined) {
      this.cause = cause
    }
    this.name = new.target.name
  }

  protected messageFrom(payload: unknown): void {
    if (typeof payload === 'string') {
      this.message = payload
    }
  }
}

export class BadRequestError extends DomainError {
  readonly status = 400 as const

  constructor(override readonly payload: unknown) {
    super()
    this.messageFrom(payload)
  }
}

export class UnauthorizedError extends DomainError {
  readonly status = 401 as const

  constructor(
    override readonly payload: unknown = 'Missing or invalid session.'
  ) {
    super()
    this.messageFrom(payload)
  }
}

export class ForbiddenError extends DomainError {
  readonly status = 403 as const

  constructor(
    override readonly payload: unknown = 'This route needs another role.'
  ) {
    super()
    this.messageFrom(payload)
  }
}

export class NotFoundError extends DomainError {
  readonly status = 404 as const

  constructor(override readonly payload: unknown) {
    super()
    this.messageFrom(payload)
  }
}

export class ConflictError extends DomainError {
  readonly status = 409 as const

  constructor(override readonly payload: unknown) {
    super()
    this.messageFrom(payload)
  }
}

export class TooManyRequestsError extends DomainError {
  readonly status = 429 as const

  constructor(override readonly payload: unknown) {
    super()
    this.messageFrom(payload)
  }
}
