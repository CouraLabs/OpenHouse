/**
 * The domain errors a service raises, and the statuses the API answers.
 *
 * The framework-agnostic vocabulary the features throw; `app.onError` maps
 * them to the response — the same status codes and bodies the previous
 * exception filters answered, so the wire contract is unchanged. A payload
 * carrying a `message` renders as `{ message, … }`; a structured payload
 * (a reconciled-edit conflict, an account's unpaid-bill summary) renders as
 * the payload itself, which the web reads field by field.
 */

/** A service error with the HTTP status the API answers it with. */
export abstract class DomainError extends Error {
  /** The status the API answers. */
  abstract readonly status: 400 | 401 | 403 | 404 | 409 | 429

  /** The body beyond the status: a message string, or a structured
   * payload the web reads field by field. */
  abstract readonly payload: unknown

  constructor(cause?: unknown) {
    super()
    if (cause !== undefined) {
      this.cause = cause
    }
    this.name = new.target.name
  }

  /** A string payload is the message: `error.message` reads as the old
   * exceptions' message did, and the API answers `{ message }`. */
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

/** A conflict: a uniqueness rule, a state the write cannot follow. The
 * payload is the body the web reads (a message, or a structured conflict). */
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
