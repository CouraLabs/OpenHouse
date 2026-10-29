import { Clock } from '../common/clock/clock.js'
import { TooManyRequestsError } from '../common/errors.js'

/** Failures one code prefix may collect per window. */
const MAX_FAILURES = 10

/** The window the failures are counted over, and how long a prefix that
 * ran out stays blocked: one hour. */
const WINDOW_MS = 60 * 60 * 1000

/**
 * Limits failed reset-code redemptions per code prefix: after 10 failures
 * for the same first five characters within an hour, that prefix answers
 * 429 until the hour has passed. It complements the per-IP throttle on the
 * route — an attacker working through one code from many addresses still
 * hits this. Enforced in every environment, unlike the global throttler.
 *
 * The counts live in memory: per isolate on Workers — one deployment's
 * isolates share nothing, so the limiter is a damper, not a wall; the
 * per-IP rate-limit binding is the wall.
 */
export class ResetAttemptLimiter {
  private readonly failures = new Map<string, number[]>()

  constructor(private readonly clock: Clock) {}

  /** Throws 429 while the prefix is out of attempts. */
  assertAllowed(prefix: string): void {
    if (this.recent(prefix).length >= MAX_FAILURES) {
      throw new TooManyRequestsError(
        'Too many attempts with this code. Try again later.'
      )
    }
  }

  /** Records a failed redemption of a code with this prefix. */
  recordFailure(prefix: string): void {
    const recent = this.recent(prefix)
    recent.push(this.clock.now().getTime())
    this.failures.set(prefix, recent)
  }

  /** The prefix's failures still inside the window. */
  private recent(prefix: string): number[] {
    const now = this.clock.now().getTime()
    const recent = (this.failures.get(prefix) ?? []).filter(
      (at) => now - at < WINDOW_MS
    )
    this.failures.set(prefix, recent)

    return recent
  }
}
