import { randomUUID } from 'node:crypto'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import {
  mailTo,
  startApp,
  turnstileToken,
  uniqueEmail,
  verificationTokenFor,
  type TestApp,
} from './support.js'

async function post(
  app: TestApp,
  path: string,
  body: unknown
): Promise<{ status: number; body: any; headers: Headers }> {
  const response = await app.request(
    path,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
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

async function signUpUnconfirmed(app: TestApp, email = uniqueEmail()) {
  const created = await post(app, '/api/auth/sign-up', {
    tenantName: `t-${randomUUID()}`,
    name: 'Ana',
    email,
    password: 'password-a',
    turnstileToken: turnstileToken('signup'),
  })

  return { created, email }
}

async function rewindLastSend(email: string, ms: number): Promise<void> {
  await (env as unknown as { DB: D1Database }).DB.prepare(
    'UPDATE users SET email_verification_sent_at = email_verification_sent_at - ? WHERE email = ?'
  )
    .bind(ms, email)
    .run()
}

describe('email verification (e2e)', () => {
  it('answers sign-up without a session and mails a confirmation link', async () => {
    const { app } = startApp()
    const { created, email } = await signUpUnconfirmed(app)

    expect(created.status).toBe(201)
    expect(created.body).toEqual({ verificationRequired: true, email })
    expect(created.headers.getSetCookie()).toEqual([])

    const [message] = mailTo(email)
    expect(message.from.email).toBe('no-reply@couralabs.dev')
    expect(message.subject).toBe('Confirm your email for OpenHouse')
    expect(message.text).toContain('/app/verify-email?token=')
  })

  it('refuses sign-in until the email is confirmed', async () => {
    const { app } = startApp()
    const { email } = await signUpUnconfirmed(app)

    const refused = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-a',
      turnstileToken: turnstileToken('login'),
    })
    expect(refused.status).toBe(403)
    expect(refused.body.code).toBe('email_unverified')

    const wrongPassword = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-x',
      turnstileToken: turnstileToken('login'),
    })
    expect(wrongPassword.status).toBe(401)
  })

  it('confirms once, signs in, and lets the password through afterwards', async () => {
    const { app } = startApp()
    const { email } = await signUpUnconfirmed(app)
    const token = verificationTokenFor(email)

    const confirmed = await post(app, '/api/auth/email/verify', { token })
    expect(confirmed.status).toBe(200)
    expect(confirmed.body.user.email).toBe(email)
    expect(confirmed.headers.getSetCookie().length).toBeGreaterThan(0)

    const replayed = await post(app, '/api/auth/email/verify', { token })
    expect(replayed.status).toBe(400)

    const signedIn = await post(app, '/api/auth/sign-in', {
      email,
      password: 'password-a',
      turnstileToken: turnstileToken('login'),
    })
    expect(signedIn.status).toBe(200)
  })

  it('rejects an unknown token with one generic 400', async () => {
    const { app } = startApp()

    const response = await post(app, '/api/auth/email/verify', {
      token: 'not-a-real-token',
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe(
      'This confirmation link is invalid or has expired.'
    )
  })

  it('answers 202 to a resend for an unknown address and sends nothing', async () => {
    const { app } = startApp()
    const email = uniqueEmail()

    const response = await post(app, '/api/auth/email/resend', {
      email,
      turnstileToken: turnstileToken('verify-resend'),
    })

    expect(response.status).toBe(202)
    expect(mailTo(email)).toEqual([])
  })

  it('holds resends to a cooldown and a daily cap, and the new link replaces the old', async () => {
    const { app } = startApp()
    const { email } = await signUpUnconfirmed(app)
    const first = verificationTokenFor(email)

    const tooSoon = await post(app, '/api/auth/email/resend', {
      email,
      turnstileToken: turnstileToken('verify-resend'),
    })
    expect(tooSoon.status).toBe(202)
    expect(mailTo(email)).toHaveLength(1)

    for (let send = 2; send <= 5; send += 1) {
      await rewindLastSend(email, 61_000)
      await post(app, '/api/auth/email/resend', {
        email,
        turnstileToken: turnstileToken('verify-resend'),
      })
      expect(mailTo(email)).toHaveLength(send)
    }

    await rewindLastSend(email, 61_000)
    await post(app, '/api/auth/email/resend', {
      email,
      turnstileToken: turnstileToken('verify-resend'),
    })
    expect(mailTo(email)).toHaveLength(5)

    const stale = await post(app, '/api/auth/email/verify', { token: first })
    expect(stale.status).toBe(400)

    const latest = await post(app, '/api/auth/email/verify', {
      token: verificationTokenFor(email),
    })
    expect(latest.status).toBe(200)
  })

  it('sends nothing more once the address is confirmed', async () => {
    const { app } = startApp()
    const { email } = await signUpUnconfirmed(app)
    await post(app, '/api/auth/email/verify', {
      token: verificationTokenFor(email),
    })
    await rewindLastSend(email, 61_000)

    await post(app, '/api/auth/email/resend', {
      email,
      turnstileToken: turnstileToken('verify-resend'),
    })

    expect(mailTo(email)).toHaveLength(1)
  })

  it('asks for the bot check when sign-up carries no token', async () => {
    const { app } = startApp()

    const response = await post(app, '/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email: uniqueEmail(),
      password: 'password-a',
    })

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('captcha_required')
  })
})
