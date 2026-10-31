import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  signUp,
  startApp,
  turnstileToken,
  uniqueEmail,
  type TestApp,
} from './support.js'

async function post(
  app: TestApp,
  path: string,
  body: unknown,
  cookie = ''
): Promise<{ status: number; body: any; headers: Headers }> {
  const response = await app.request(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.7',
        ...(cookie === '' ? {} : { cookie }),
      },
    },
    app.bindings
  )
  const text = await response.text()

  return {
    status: response.status,
    body: text === '' ? null : JSON.parse(text),
    headers: response.headers,
  }
}

async function get(app: TestApp, path: string): Promise<any> {
  return (await app.request(path, {}, app.bindings)).json()
}

describe('sign-in bot check (e2e)', () => {
  it('lets a first sign-in through and asks on a second one within 5 seconds', async () => {
    const { app } = startApp()
    const email = uniqueEmail()
    await signUp(app, email)

    const first = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-a',
    })
    expect(first.status).toBe(200)

    const second = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-a',
    })
    expect(second.status).toBe(403)
    expect(second.body.code).toBe('captcha_required')

    const solved = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-a',
      turnstileToken: turnstileToken('login'),
    })
    expect(solved.status).toBe(200)
  })

  it('rejects a token minted for another action', async () => {
    const { app } = startApp()
    const email = uniqueEmail()
    await signUp(app, email)

    const response = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-a',
      turnstileToken: turnstileToken('signup'),
    })

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('captcha_failed')
  })
})

describe('invite bot check (e2e)', () => {
  it('asks for the bot check before issuing an invite code', async () => {
    const { app } = startApp()
    const owner = await signUp(app)

    const refused = await owner.post('/api/tenants/invite-codes', {
      expiresInDays: 7,
    })
    expect(refused.status).toBe(403)
    expect(refused.body.code).toBe('captcha_required')

    const issued = await owner.post('/api/tenants/invite-codes', {
      expiresInDays: 7,
      turnstileToken: turnstileToken('invite'),
    })
    expect(issued.status).toBe(201)
  })
})

describe('feature switches (e2e)', () => {
  it('publishes the switches the web needs', async () => {
    const { app } = startApp()

    expect(await get(app, '/api/auth/config')).toEqual({
      captcha: { siteKey: 'test-turnstile-site-key' },
      emailVerification: true,
    })
  })

  it('signs the user in at sign-up when email verification is off', async () => {
    const { app } = startApp({ KANTIM_ENABLE_EMAIL_VERIFICATION: 'false' })
    const email = uniqueEmail()

    const created = await post(app, '/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email,
      password: 'password-a',
      turnstileToken: turnstileToken('signup'),
    })

    expect(created.status).toBe(201)
    expect(created.body.user.email).toBe(email)
    expect(created.headers.getSetCookie().length).toBeGreaterThan(0)
    expect(await get(app, '/api/auth/config')).toEqual({
      captcha: { siteKey: 'test-turnstile-site-key' },
      emailVerification: false,
    })
  })

  it('skips the bot check when the captcha switch is off', async () => {
    const { app } = startApp({ KANTIM_ENABLE_CAPTCHA_CHECK: 'false' })

    const created = await post(app, '/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email: uniqueEmail(),
      password: 'password-a',
    })

    expect(created.status).toBe(201)
  })

  it('ignores both switches in development', async () => {
    const { app } = startApp({ ENVIRONMENT: 'development' })

    const created = await post(app, '/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email: uniqueEmail(),
      password: 'password-a',
    })

    expect(created.status).toBe(201)
    expect(created.body.user).toBeDefined()
    expect(await get(app, '/api/auth/config')).toEqual({
      captcha: null,
      emailVerification: false,
    })
  })
})
