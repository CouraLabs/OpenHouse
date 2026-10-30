import { afterEach, describe, expect, it } from 'vitest'

import { config, resetConfigCache, type Env } from './env.js'

const bindings = {
  DB: undefined,
  JOBS: undefined,
  RATE_LIMIT: undefined,
  RATE_LIMIT_CREDENTIALS: undefined,
  ASSETS: undefined,
}

function parse(vars: Partial<Env>) {
  resetConfigCache()

  return config({ ...bindings, ...vars } as Env)
}

const turnstile = {
  TURNSTILE_SECRET: 'secret',
  TURNSTILE_SITE_KEY: 'site-key',
  TURNSTILE_HOSTNAMES: 'openhouse.couralabs.dev',
}

describe('config', () => {
  afterEach(() => resetConfigCache())

  it('defaults to production and refuses the development JWT secret there', () => {
    expect(() => parse({})).toThrow('JWT_SECRET must be set in production.')
  })

  it('turns both switches off in development, whatever they say', () => {
    const parsed = parse({
      ENVIRONMENT: 'development',
      OPENHOUSE_ENABLE_EMAIL_VERIFICATION: 'true',
      OPENHOUSE_ENABLE_CAPTCHA_CHECK: 'true',
    })

    expect(parsed.environment).toBe('development')
    expect(parsed.features).toEqual({
      emailVerification: false,
      captcha: false,
    })
    expect(parsed.turnstile).toBeUndefined()
  })

  it('reads the switches in production', () => {
    const parsed = parse({
      JWT_SECRET: 'a-real-secret',
      OPENHOUSE_ENABLE_EMAIL_VERIFICATION: 'false',
      OPENHOUSE_ENABLE_CAPTCHA_CHECK: 'true',
      ...turnstile,
    })

    expect(parsed.features).toEqual({ emailVerification: false, captcha: true })
    expect(parsed.turnstile?.siteKey).toBe('site-key')
  })

  it('refuses to boot with the captcha on and no Turnstile secret', () => {
    expect(() =>
      parse({
        JWT_SECRET: 'a-real-secret',
        OPENHOUSE_ENABLE_CAPTCHA_CHECK: 'true',
      })
    ).toThrow(/TURNSTILE_SECRET/)
  })

  it('rejects an unknown environment', () => {
    expect(() =>
      parse({ ENVIRONMENT: 'staging', JWT_SECRET: 'a-real-secret' })
    ).toThrow()
  })
})
