import { Clock } from '../common/clock/clock.js'
import { TooManyRequestsError } from '../common/errors.js'

const MAX_ATTEMPTS = 5

const WINDOW_MS = 15 * 60 * 1000

export class PasswordChangeLimiter {
  private readonly attempts = new Map<number, number[]>()

  constructor(private readonly clock: Clock) {}

  consume(userId: number): void {
    const now = this.clock.now().getTime()
    const recent = (this.attempts.get(userId) ?? []).filter(
      (at) => now - at < WINDOW_MS
    )

    if (recent.length >= MAX_ATTEMPTS) {
      this.attempts.set(userId, recent)
      throw new TooManyRequestsError(
        'Too many password change attempts. Try again later.'
      )
    }

    recent.push(now)
    this.attempts.set(userId, recent)
  }
}
