import { Clock } from '../common/clock/clock.js'
import { TooManyRequestsError } from '../common/errors.js'

const MAX_FAILURES = 10

const WINDOW_MS = 60 * 60 * 1000

export class ResetAttemptLimiter {
  private readonly failures = new Map<string, number[]>()

  constructor(private readonly clock: Clock) {}

  assertAllowed(prefix: string): void {
    if (this.recent(prefix).length >= MAX_FAILURES) {
      throw new TooManyRequestsError(
        'Too many attempts with this code. Try again later.'
      )
    }
  }

  recordFailure(prefix: string): void {
    const recent = this.recent(prefix)
    recent.push(this.clock.now().getTime())
    this.failures.set(prefix, recent)
  }

  private recent(prefix: string): number[] {
    const now = this.clock.now().getTime()
    const recent = (this.failures.get(prefix) ?? []).filter(
      (at) => now - at < WINDOW_MS
    )
    this.failures.set(prefix, recent)

    return recent
  }
}
