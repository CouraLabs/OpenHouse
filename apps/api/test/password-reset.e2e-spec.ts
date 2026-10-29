import { createHash } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import { getDrizzleToken } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import { passwordResetCodes } from '@workspace/db'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import type { App } from 'supertest/types.js'

import { PasswordResetService } from '../src/auth/password-reset.service.js'
import {
  type Agent,
  joinAsMember,
  signUp,
  startApp,
  uniqueEmail,
} from './support.js'

/** Redeems a code from a fresh, signed-out browser. */
function redeem(
  app: INestApplication<App>,
  code: string,
  newPassword = 'password-new'
) {
  return request
    .agent(app.getHttpServer())
    .post('/auth/password/reset')
    .send({ code, newPassword })
}

/** Signs in from a fresh browser and answers the status. */
async function signInStatus(
  app: INestApplication<App>,
  email: string,
  password: string
): Promise<number> {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-in')
    .send({ email, password })

  return response.status
}

/** The owner issues a reset code for a member and answers it. */
async function issueFor(owner: Agent, userId: number): Promise<string> {
  const issued = await owner
    .post('/auth/password/reset-codes')
    .send({ userId })
    .expect(201)

  return issued.body.code
}

describe('password recovery without email (e2e, #11)', () => {
  let app: INestApplication<App>
  let db: Database

  beforeAll(async () => {
    app = await startApp()
    db = app.get<Database>(getDrizzleToken())
  })

  afterAll(async () => {
    await app.close()
  })

  it('lets a member redeem an owner-issued code once: new password, every session signed out', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const issued = await owner
      .post('/auth/password/reset-codes')
      .send({ userId: member.id })
      .expect(201)
    expect(issued.body.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
    const minutes =
      (new Date(issued.body.expiresAt).getTime() - Date.now()) / 60_000
    expect(minutes).toBeGreaterThan(29)
    expect(minutes).toBeLessThanOrEqual(30)

    // The member's password keeps working until the code is used.
    expect(await signInStatus(app, member.email, 'password-m')).toBe(200)

    const browser = request.agent(app.getHttpServer())
    const redeemed = await browser
      .post('/auth/password/reset')
      .send({
        code: issued.body.code.toLowerCase(),
        newPassword: 'password-new',
      })
      .expect(200)
    expect(redeemed.body.user.id).toBe(member.id)
    // …and the redeeming browser is signed in.
    await browser.get('/auth/me').expect(200)

    expect(await signInStatus(app, member.email, 'password-m')).toBe(401)
    expect(await signInStatus(app, member.email, 'password-new')).toBe(200)
    // The member's earlier session cannot be renewed.
    await member.agent.post('/auth/refresh').expect(401)
    // Single use.
    const again = await redeem(app, issued.body.code).expect(400)
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
    const replaced = await redeem(app, first).expect(400)

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
    const expired = await redeem(app, second).expect(400)
    const wrong = await redeem(app, 'ZZZZZ-ZZZZZ').expect(400)

    for (const response of [replaced, expired, wrong]) {
      expect(response.body.message).toBe('This code is not valid.')
    }
  })

  it('keeps issuing codes an owner-only action, never for an owner', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)
    const me = await owner.get('/auth/me').expect(200)

    await member.agent
      .post('/auth/password/reset-codes')
      .send({ userId: member.id })
      .expect(403)
    await member.agent.post('/auth/recovery-codes').expect(403)
    await owner
      .post('/auth/password/reset-codes')
      .send({ userId: me.body.user.id })
      .expect(409)

    // A user of another tenant is not the owner's to reset.
    const stranger = await joinAsMember(app, await signUp(app))
    await owner
      .post('/auth/password/reset-codes')
      .send({ userId: stranger.id })
      .expect(404)
  })

  it('gives the owner 10 single-use recovery codes; a new set retires the old', async () => {
    const email = uniqueEmail()
    const owner = await signUp(app, email)

    const first = await owner.post('/auth/recovery-codes').expect(201)
    expect(first.body.codes).toHaveLength(10)
    const security = await owner.get('/auth/security').expect(200)
    expect(security.body.recoveryCodes.remaining).toBe(10)
    expect(security.body.recoveryCodes.generatedAt).not.toBeNull()

    await redeem(app, first.body.codes[0], 'password-r1').expect(200)
    expect(await signInStatus(app, email, 'password-r1')).toBe(200)
    await redeem(app, first.body.codes[0], 'password-r2').expect(400)

    const relogged = request.agent(app.getHttpServer())
    await relogged
      .post('/auth/sign-in')
      .send({ email, password: 'password-r1' })
      .expect(200)
    expect(
      (await relogged.get('/auth/security').expect(200)).body.recoveryCodes
        .remaining
    ).toBe(9)

    const second = await relogged.post('/auth/recovery-codes').expect(201)
    await redeem(app, first.body.codes[1]).expect(400)
    await redeem(app, second.body.codes[0]).expect(200)
  })

  it('prints a server code that works, and tells the user at next sign-in', async () => {
    const email = uniqueEmail()
    await signUp(app, email)

    // The command's own service — no HTTP route issues these codes.
    const issued = await app
      .get(PasswordResetService)
      .issueFromServer(email.toUpperCase())

    const browser = request.agent(app.getHttpServer())
    await browser
      .post('/auth/password/reset')
      .send({ code: issued.code, newPassword: 'password-srv' })
      .expect(200)

    const security = await browser.get('/auth/security').expect(200)
    expect(security.body.serverResetNotices).toHaveLength(1)

    await browser.post('/auth/security/notices/seen').expect(204)
    expect(
      (await browser.get('/auth/security').expect(200)).body.serverResetNotices
    ).toEqual([])
  })
})
