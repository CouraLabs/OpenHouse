import { describe, expect, it } from 'vitest'

import { ForbiddenError } from '../errors.js'
import { type SiteverifyFn, TurnstileVerifier } from './turnstile-verifier.js'

const config = {
  secret: 'secret',
  hostnames: ['kantim.couralabs.dev'],
  siteKey: 'site-key',
}

function answering(body: {
  success?: boolean
  action?: string
  hostname?: string
}): SiteverifyFn {
  return async () => body
}

const unanswered: SiteverifyFn = async () => undefined

const neverCalled: SiteverifyFn = async () => {
  throw new Error('must not be called')
}

describe('TurnstileVerifier', () => {
  it('passes a successful token for the expected action and hostname', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({
        success: true,
        action: 'signup',
        hostname: 'kantim.couralabs.dev',
      })
    )

    await expect(verifier.verify('token', 'signup', '1.2.3.4')).resolves.toBe(
      undefined
    )
  })

  it('rejects a failed token', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({ success: false })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('rejects a token minted for another action', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({
        success: true,
        action: 'login',
        hostname: 'kantim.couralabs.dev',
      })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('rejects a token minted on another hostname', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({ success: true, action: 'signup', hostname: 'localhost' })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('fails closed when siteverify is unreachable', async () => {
    const verifier = new TurnstileVerifier(config, unanswered)

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('fails closed on a non-2xx answer', async () => {
    const verifier = new TurnstileVerifier(config, unanswered)

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('asks for the bot check when no token came', async () => {
    const verifier = new TurnstileVerifier(config, neverCalled)

    await expect(
      verifier.verify(undefined, 'signup', '1.2.3.4')
    ).rejects.toMatchObject({ payload: { code: 'captcha_required' } })
  })

  it('tags a failed check as captcha_failed', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({ success: false })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toMatchObject({ payload: { code: 'captcha_failed' } })
  })

  it('skips the check when no secret is configured', async () => {
    const verifier = new TurnstileVerifier(undefined, neverCalled)

    await expect(verifier.verify('anything', 'signup', '')).resolves.toBe(
      undefined
    )
  })
})
