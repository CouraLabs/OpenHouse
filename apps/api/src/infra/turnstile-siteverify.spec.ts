import { describe, expect, it } from 'vitest'

import { ForbiddenError } from '@workspace/business'

import { createTurnstileVerifier } from './turnstile-siteverify.js'

const config = {
  secret: 'secret',
  hostnames: ['kantim.couralabs.dev'],
  siteKey: 'site-key',
}

function answering(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

describe('createTurnstileVerifier', () => {
  it('passes a successful token for the expected action and hostname', async () => {
    const verifier = createTurnstileVerifier(
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
    const verifier = createTurnstileVerifier(
      config,
      answering({ success: false, 'error-codes': ['timeout-or-duplicate'] })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('rejects a token minted for another action', async () => {
    const verifier = createTurnstileVerifier(
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
    const verifier = createTurnstileVerifier(
      config,
      answering({ success: true, action: 'signup', hostname: 'localhost' })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('fails closed when siteverify is unreachable', async () => {
    const verifier = createTurnstileVerifier(config, async () => {
      throw new Error('network down')
    })

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('fails closed on a non-2xx answer', async () => {
    const verifier = createTurnstileVerifier(config, answering({}, 500))

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('asks for the bot check when no token came', async () => {
    const verifier = createTurnstileVerifier(config, async () => {
      throw new Error('must not be called')
    })

    await expect(
      verifier.verify(undefined, 'signup', '1.2.3.4')
    ).rejects.toMatchObject({ payload: { code: 'captcha_required' } })
  })

  it('tags a failed check as captcha_failed', async () => {
    const verifier = createTurnstileVerifier(
      config,
      answering({ success: false })
    )

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toMatchObject({ payload: { code: 'captcha_failed' } })
  })

  it('skips the check when no secret is configured', async () => {
    const verifier = createTurnstileVerifier(undefined, async () => {
      throw new Error('must not be called')
    })

    await expect(verifier.verify('anything', 'signup', '')).resolves.toBe(
      undefined
    )
  })
})
