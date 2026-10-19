import { HttpException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import type { Clock } from '../common/clock/clock.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'

/** A clock the spec moves by hand. */
const clockAt = (start: string) => {
  let now = new Date(start).getTime()

  return {
    clock: { now: () => new Date(now) } satisfies Clock,
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('ResetAttemptLimiter', () => {
  it('blocks a prefix after 10 failures, for an hour', () => {
    const { clock, advance } = clockAt('2026-10-19T12:00:00Z')
    const limiter = new ResetAttemptLimiter(clock)

    for (let failure = 0; failure < 10; failure += 1) {
      limiter.assertAllowed('ABCDE')
      limiter.recordFailure('ABCDE')
    }

    expect(() => limiter.assertAllowed('ABCDE')).toThrow(HttpException)
    // Another prefix is unaffected.
    expect(() => limiter.assertAllowed('FGHJK')).not.toThrow()

    advance(59 * 60 * 1000)
    expect(() => limiter.assertAllowed('ABCDE')).toThrow(HttpException)

    advance(60 * 1000)
    expect(() => limiter.assertAllowed('ABCDE')).not.toThrow()
  })
})
