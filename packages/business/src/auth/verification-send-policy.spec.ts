import { describe, expect, it } from 'vitest'

import {
  decideSend,
  MAX_SENDS_PER_WINDOW,
  RESEND_COOLDOWN_MS,
  SEND_WINDOW_MS,
} from './verification-send-policy.js'

const now = new Date('2026-10-29T12:00:00.000Z')

function ago(ms: number): Date {
  return new Date(now.getTime() - ms)
}

describe('decideSend', () => {
  it('opens a window on the first send', () => {
    expect(decideSend({ sentAt: null, windowAt: null, sends: 0 }, now)).toEqual(
      { allowed: true, windowAt: now, sends: 1 }
    )
  })

  it('refuses inside the cooldown', () => {
    expect(
      decideSend(
        { sentAt: ago(RESEND_COOLDOWN_MS - 1), windowAt: ago(1000), sends: 1 },
        now
      )
    ).toEqual({ allowed: false })
  })

  it('counts a send after the cooldown inside the window', () => {
    const windowAt = ago(10 * 60 * 1000)

    expect(
      decideSend({ sentAt: ago(RESEND_COOLDOWN_MS), windowAt, sends: 2 }, now)
    ).toEqual({ allowed: true, windowAt, sends: 3 })
  })

  it('refuses once the window is spent', () => {
    expect(
      decideSend(
        {
          sentAt: ago(2 * RESEND_COOLDOWN_MS),
          windowAt: ago(60 * 60 * 1000),
          sends: MAX_SENDS_PER_WINDOW,
        },
        now
      )
    ).toEqual({ allowed: false })
  })

  it('starts a fresh window once the old one has passed', () => {
    expect(
      decideSend(
        {
          sentAt: ago(SEND_WINDOW_MS - 1000),
          windowAt: ago(SEND_WINDOW_MS),
          sends: MAX_SENDS_PER_WINDOW,
        },
        now
      )
    ).toEqual({ allowed: true, windowAt: now, sends: 1 })
  })
})
