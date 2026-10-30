import { describe, expect, it } from 'vitest'

import {
  needsSignInCaptcha,
  RAPID_SIGN_IN_WINDOW_MS,
} from './sign-in-captcha-policy.js'

const now = new Date('2026-10-29T12:00:00.000Z')

function ago(ms: number): Date {
  return new Date(now.getTime() - ms)
}

describe('needsSignInCaptcha', () => {
  it('lets a first attempt through', () => {
    expect(needsSignInCaptcha([null, null], now)).toBe(false)
  })

  it('asks for the check on a second attempt inside the window', () => {
    expect(
      needsSignInCaptcha([ago(RAPID_SIGN_IN_WINDOW_MS - 1), null], now)
    ).toBe(true)
  })

  it('asks when either key was seen recently', () => {
    expect(needsSignInCaptcha([ago(60_000), ago(1_000)], now)).toBe(true)
  })

  it('lets an attempt through once the window has passed', () => {
    expect(needsSignInCaptcha([ago(RAPID_SIGN_IN_WINDOW_MS)], now)).toBe(false)
  })
})
