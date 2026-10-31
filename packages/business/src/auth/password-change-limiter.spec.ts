import { describe, expect, it } from 'vitest'

import { TooManyRequestsError } from '../errors.js'
import type { Clock } from '../ports/clock.js'
import { PasswordChangeLimiter } from './password-change-limiter.js'

const movableClock = () => {
  let now = new Date('2026-10-15T12:00:00Z').getTime()

  return {
    clock: { now: () => new Date(now) } satisfies Clock,
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('PasswordChangeLimiter', () => {
  it('allows 5 attempts per user, then answers 429', () => {
    const { clock } = movableClock()
    const limiter = new PasswordChangeLimiter(clock)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.consume(7)
    }

    expect(() => limiter.consume(7)).toThrow(TooManyRequestsError)
    expect(() => limiter.consume(8)).not.toThrow()
  })

  it('frees attempts once the 15-minute window passes', () => {
    const { clock, advance } = movableClock()
    const limiter = new PasswordChangeLimiter(clock)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      limiter.consume(7)
    }
    advance(15 * 60 * 1000)

    expect(() => limiter.consume(7)).not.toThrow()
  })
})
