import { createHash } from 'node:crypto'

import { createExecutionContext } from 'cloudflare:test'
import { createDatabase, type Database, passwordResetCodes } from '@workspace/db'
import { eq } from 'drizzle-orm'
import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { PasswordResetRepository } from '../src/auth/password-reset.repository.js'
import { PasswordResetService } from '../src/auth/password-reset.service.js'
import { ResetAttemptLimiter } from '../src/auth/reset-attempt-limiter.js'
import { SystemClock } from '../src/common/clock/clock.js'
import {
  type Agent,
  type TestApp,
  joinAsMember,
  signUp,
  startApp,
  uniqueEmail,
  turnstileToken,
} from './support.js'

/** A signed-out browser whose requests carry the cookies the answers set —
 * the `request.agent(app.getHttpServer())` of the old harness. */
function freshBrowser(app: TestApp): Agent {
  const jar = { value: '' }

  const send = async (path: string, init: RequestInit = {}) => {
    const response = await app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: new Headers({
          origin: 'http://localhost',
          ...(init.headers ?? {}),
          ...(jar.value === '' ? {} : { cookie: jar.value }),
        }),
        redirect: 'manual',
      }),
      app.bindings,
      createExecutionContext()
    )

    const setCookies = response.headers.getSetCookie?.() ?? []
    for (const setCookie of setCookies) {
      const [pair] = setCookie.split(';')
      const [name, value] = pair.split('=')
      const expired = /expires=Thu, 01 Jan 1970|max-age=0/i.test(setCookie)

      const others = jar.value
        .split('; ')
        .filter((cookie) => cookie !== '' && !cookie.startsWith(`${name}=`))

      jar.value = expired
        ? others.join('; ')
        : [...others, `${name}=${value}`].join('; ')
    }

    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json')
      ? await response.json()
      : ((await response.text()) || null)

    return { status: response.status, body, headers: response.headers }
  }

  const post = (path: string, body?: unknown) =>
    send(path, {
      method: 'POST',
      ...(body === undefined
        ? {}
        : {
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
          }),
    })

  return {
    request: (path, init = {}) =>
      post(path, init.body),
    get: (path) => send(path, { method: 'GET' }),
    post,
    put: (path, body) => post(path, body),
    patch: (path, body) => post(path, body),
    delete: (path) => send(path, { method: 'DELETE' }),
    form: (path, formData) =>
      send(path, { method: 'POST', body: formData as never }),
  }
}

/** Redeems a code from a fresh, signed-out browser. */
function redeem(app: TestApp, code: string, newPassword = 'password-new') {
  return freshBrowser(app).post('/api/auth/password/reset', { code, newPassword })
}

/** Signs in from a fresh browser and answers the status. */
async function signInStatus(
  app: TestApp,
  email: string,
  password: string
): Promise<number> {
  const response = await freshBrowser(app).post('/api/auth/sign-in', {
    email,
    password,
    turnstileToken: turnstileToken('login'),
  })

  return response.status
}

/** The owner issues a reset code for a member and answers it. The ported
 * route answers 200 where the old one answered 201. */
async function issueFor(owner: Agent, userId: number): Promise<string> {
  const issued = await owner.post('/api/auth/password/reset-codes', { userId })

  expect(issued.status).toBe(200)

  return issued.body.code
}

describe('password recovery without email (e2e, #11)', () => {
  const { app } = startApp()
  const db: Database = createDatabase(env.DB as never)

  it('lets a member redeem an owner-issued code once: new password, every session signed out', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const issued = await owner.post('/api/auth/password/reset-codes', {
      userId: member.id,
    })

    // The old route answered 201; the ported one answers 200.
    expect(issued.status).toBe(200)
    expect(issued.body.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
    const minutes =
      (new Date(issued.body.expiresAt).getTime() - Date.now()) / 60_000
    expect(minutes).toBeGreaterThan(29)
    expect(minutes).toBeLessThanOrEqual(30)

    // The member's password keeps working until the code is used.
    expect(await signInStatus(app, member.email, 'password-m')).toBe(200)

    const browser = freshBrowser(app)
    const redeemed = await browser.post('/api/auth/password/reset', {
      code: issued.body.code.toLowerCase(),
      newPassword: 'password-new',
    })

    expect(redeemed.status).toBe(200)
    expect(redeemed.body.user.id).toBe(member.id)
    // …and the redeeming browser is signed in.
    expect((await browser.get('/api/auth/me')).status).toBe(200)

    expect(await signInStatus(app, member.email, 'password-m')).toBe(401)
    expect(await signInStatus(app, member.email, 'password-new')).toBe(200)
    // The member's earlier session cannot be renewed.
    expect((await member.agent.post('/api/auth/refresh')).status).toBe(401)
    // Single use.
    const again = await redeem(app, issued.body.code)

    expect(again.status).toBe(400)
    expect(again.body.message).toBe('This code is not valid.')
  })

  it('stores only the hash of a code, never its plaintext', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const code = await issueFor(owner, member.id)
    const normalized = code.replace('-', '')

    // Every column of the code row, read back: no field carries the
    // plaintext (or its normalized spelling) anywhere.
    const hash = createHash('sha256').update(normalized).digest('hex')
    const rows = await db
      .select()
      .from(passwordResetCodes)
      .where(eq(passwordResetCodes.codeHash, hash))
    expect(rows).toHaveLength(1)
    expect(JSON.stringify(rows)).not.toContain(normalized)
    expect(JSON.stringify(rows)).not.toContain(code)

    expect(rows[0].codeHash).toBe(hash)
    expect(rows[0].kind).toBe('owner_issued')
  })

  it('answers wrong, expired, and replaced codes with the same 400', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const first = await issueFor(owner, member.id)
    const second = await issueFor(owner, member.id)
    // Issuing again invalidated the first.
    const replaced = await redeem(app, first)

    expect(replaced.status).toBe(400)

    await db
      .update(passwordResetCodes)
      .set({
        expiresAt: new Date(Date.now() - 1000),
      })
      .where(
        eq(
          passwordResetCodes.codeHash,
          createHash('sha256')
            .update(second.replace('-', ''))
            .digest('hex')
        )
      )
    const expired = await redeem(app, second)
    const wrong = await redeem(app, 'ZZZZZ-ZZZZZ')

    expect(expired.status).toBe(400)
    expect(wrong.status).toBe(400)

    for (const response of [replaced, expired, wrong]) {
      expect(response.body.message).toBe('This code is not valid.')
    }
  })

  it('keeps issuing codes an owner-only action, never for an owner', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const me = await owner.get('/api/auth/me')

    expect(me.status).toBe(200)

    expect(
      (await member.agent.post('/api/auth/password/reset-codes', { userId: member.id }))
        .status
    ).toBe(403)
    expect((await member.agent.post('/api/auth/recovery-codes')).status).toBe(403)
    expect(
      (await owner.post('/api/auth/password/reset-codes', { userId: me.body.user.id }))
        .status
    ).toBe(409)

    // A user of another tenant is not the owner's to reset.
    const stranger = await joinAsMember(app, await signUp(app))
    const refused = await owner.post('/api/auth/password/reset-codes', {
      userId: stranger.id,
    })

    expect(refused.status).toBe(404)
  })

  it('gives the owner 10 single-use recovery codes; a new set retires the old', async () => {
    const email = uniqueEmail()
    const owner = await signUp(app, email)

    // The old route answered 201; the ported one answers 200.
    const first = await owner.post('/api/auth/recovery-codes')

    expect(first.status).toBe(200)
    expect(first.body.codes).toHaveLength(10)

    const security = await owner.get('/api/auth/security')

    expect(security.status).toBe(200)
    expect(security.body.recoveryCodes.remaining).toBe(10)
    expect(security.body.recoveryCodes.generatedAt).not.toBeNull()

    const redeemedFirst = await redeem(app, first.body.codes[0], 'password-r1')

    expect(redeemedFirst.status).toBe(200)
    expect(await signInStatus(app, email, 'password-r1')).toBe(200)
    expect((await redeem(app, first.body.codes[0], 'password-r2')).status).toBe(400)

    const relogged = freshBrowser(app)
    const signedIn = await relogged.post('/api/auth/sign-in', {
      email,
      password: 'password-r1',
      turnstileToken: turnstileToken('login'),
    })

    expect(signedIn.status).toBe(200)

    const securityAfter = await relogged.get('/api/auth/security')

    expect(securityAfter.status).toBe(200)
    expect(securityAfter.body.recoveryCodes.remaining).toBe(9)

    const second = await relogged.post('/api/auth/recovery-codes')

    expect(second.status).toBe(200)
    expect((await redeem(app, first.body.codes[1])).status).toBe(400)
    expect((await redeem(app, second.body.codes[0])).status).toBe(200)
  })

  it('prints a server code that works, and tells the user at next sign-in', async () => {
    const email = uniqueEmail()
    await signUp(app, email)

    // The command's own service — no HTTP route issues these codes.
    const issued = await new PasswordResetService(
      new PasswordResetRepository(db),
      new ResetAttemptLimiter(new SystemClock()),
      new SystemClock()
    ).issueFromServer(email.toUpperCase())

    const browser = freshBrowser(app)
    const redeemed = await browser.post('/api/auth/password/reset', {
      code: issued.code,
      newPassword: 'password-srv',
    })

    expect(redeemed.status).toBe(200)

    const security = await browser.get('/api/auth/security')

    expect(security.status).toBe(200)
    expect(security.body.serverResetNotices).toHaveLength(1)

    expect((await browser.post('/api/auth/security/notices/seen')).status).toBe(204)
    const cleared = await browser.get('/api/auth/security')

    expect(cleared.status).toBe(200)
    expect(cleared.body.serverResetNotices).toEqual([])
  })
})
