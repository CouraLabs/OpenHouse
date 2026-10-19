import { HttpException, HttpStatus, Injectable } from '@nestjs/common'

import { Clock } from '../common/clock/clock.js'

/** Attempts one user may make per window. */
const MAX_ATTEMPTS = 5

/** The window the attempts are counted over: 15 minutes. */
const WINDOW_MS = 15 * 60 * 1000

/**
 * Limits password-change attempts per user, so a hijacked session cannot
 * brute-force the current password. Counted per user, not per IP, and
 * enforced in every environment — unlike the global throttler.
 *
 * The counts live in memory: enough while the API is one process, like the
 * throttler's store.
 */
@Injectable()
export class PasswordChangeLimiter {
  private readonly attempts = new Map<number, number[]>()

  constructor(private readonly clock: Clock) {}

  /** Records an attempt, or throws 429 when the user is out of attempts. */
  consume(userId: number): void {
    const now = this.clock.now().getTime()
    const recent = (this.attempts.get(userId) ?? []).filter(
      (at) => now - at < WINDOW_MS
    )

    if (recent.length >= MAX_ATTEMPTS) {
      this.attempts.set(userId, recent)
      throw new HttpException(
        'Too many password change attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS
      )
    }

    recent.push(now)
    this.attempts.set(userId, recent)
  }
}
