import { describe, expect, it } from 'vitest'

import { ForbiddenError } from '../errors.js'
import { TurnstileVerifier } from './turnstile-verifier.js'

const config = { secret: 'secret', hostnames: ['openhouse.couralabs.dev'] }

function answering(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
}

describe('TurnstileVerifier', () => {
  it('passes a successful token for the expected action and hostname', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({
        success: true,
        action: 'signup',
        hostname: 'openhouse.couralabs.dev',
      })
    )

    await expect(verifier.verify('token', 'signup', '1.2.3.4')).resolves.toBe(
      undefined
    )
  })

  it('rejects a failed token', async () => {
    const verifier = new TurnstileVerifier(
      config,
      answering({ success: false, 'error-codes': ['timeout-or-duplicate'] })
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
        hostname: 'openhouse.couralabs.dev',
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
    const verifier = new TurnstileVerifier(config, async () => {
      throw new Error('network down')
    })

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('fails closed on a non-2xx answer', async () => {
    const verifier = new TurnstileVerifier(config, answering({}, 500))

    await expect(
      verifier.verify('token', 'signup', '1.2.3.4')
    ).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('skips the check when no secret is configured', async () => {
    const verifier = new TurnstileVerifier(undefined, async () => {
      throw new Error('must not be called')
    })

    await expect(verifier.verify('anything', 'signup', '')).resolves.toBe(
      undefined
    )
  })
})
