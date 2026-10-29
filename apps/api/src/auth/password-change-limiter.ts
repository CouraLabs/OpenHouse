import { Clock } from '../common/clock/clock.js'
import { TooManyRequestsError } from '../common/errors.js'

/** Attempts one user may make per window. */
const MAX_ATTEMPTS = 5

/** The window the attempts are counted over: 15 minutes. */
const WINDOW_MS = 15 * 60 * 1000

/**
 * Limits password-change attempts per user, so a hijacked session cannot
 * brute-force the current password. Counted per user, not per IP, and
 * enforced in every environment — unlike the global rate limit.
 *
 * The counts live in memory: per isolate on Workers — one deployment's
 * isolates share nothing, so the limiter is a damper, not a wall; the
 * per-IP rate-limit binding is the wall.
 */
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
      throw new TooManyRequestsError(
        'Too many password change attempts. Try again later.'
      )
    }

    recent.push(now)
    this.attempts.set(userId, recent)
  }
}
