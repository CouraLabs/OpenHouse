import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import type { INestApplication } from '@nestjs/common'
import { getDrizzleToken } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import type { App } from 'supertest/types.js'

import {
  createAccount,
  joinAsMember,
  signUp,
  startApp,
  uniqueEmail,
} from './support.js'

describe('tenant settings (e2e, #15)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('creates the settings row with the sign-up, from the browser zone and currency', async () => {
    const agent = request.agent(app.getHttpServer())

    const created = await agent
      .post('/auth/sign-up')
      .send({
        tenantName: `t-${randomUUID()}`,
        name: 'Ana',
        email: uniqueEmail(),
        password: 'password-a',
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
      })
      .expect(201)

    expect(created.body.settings).toEqual({
      timezone: 'America/Sao_Paulo',
      mainCurrency: 'BRL',
      timezoneConfirmed: true,
    })
    const me = await agent.get('/auth/me').expect(200)
    expect(me.body.settings.mainCurrency).toBe('BRL')
  })

  it('rejects a sign-up with an unknown time zone, creating nothing', async () => {
    const tenantName = `t-${randomUUID()}`

    await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({
        tenantName,
        name: 'Ana',
        email: uniqueEmail(),
        password: 'password-a',
        timezone: 'Mars/Olympus_Mons',
      })
      .expect(400)
  })

  it('lets the owner save settings and rejects invalid ones with 400', async () => {
    const owner = await signUp(app)

    const saved = await owner
      .put('/settings')
      .send({ timezone: 'Europe/Lisbon', mainCurrency: 'EUR' })
      .expect(200)
    expect(saved.body).toEqual({
      timezone: 'Europe/Lisbon',
      mainCurrency: 'EUR',
      timezoneConfirmed: true,
    })

    await owner
      .put('/settings')
      .send({ timezone: 'Nowhere/City', mainCurrency: 'EUR' })
      .expect(400)
    await owner
      .put('/settings')
      .send({ timezone: 'UTC', mainCurrency: 'JPY' })
      .expect(400)
  })

  it('lets a member read the settings but not change them', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    await member.agent.get('/settings').expect(200)
    await member.agent
      .put('/settings')
      .send({ timezone: 'UTC', mainCurrency: 'USD' })
      .expect(403)
  })

  it('backfills an existing tenant on UTC, unconfirmed, in its most used currency', async () => {
    const owner = await signUp(app)
    await createAccount(owner, { currency: 'BRL' })
    await createAccount(owner, { currency: 'BRL' })
    await createAccount(owner, { currency: 'EUR' })
    const me = await owner.get('/auth/me').expect(200)
    const tenantId: number = me.body.tenant.id
    const db = app.get<Database>(getDrizzleToken())

    // Recreate the pre-migration state for this tenant, then run the
    // migration's backfill statement as it ships.
    await db.execute(
      sql`DELETE FROM tenant_settings WHERE tenant_id = ${tenantId}`
    )
    await db.execute(sql.raw(backfillStatement()))

    const settings = await owner.get('/settings').expect(200)
    expect(settings.body).toEqual({
      timezone: 'UTC',
      mainCurrency: 'BRL',
      timezoneConfirmed: false,
    })
  })
})

describe('users management (e2e, #15)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('lists the users and keeps every route owner-only', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const listed = await owner.get('/tenants/users').expect(200)
    expect(listed.body.map((row: { role: string }) => row.role)).toEqual([
      'owner',
      'user',
    ])
    expect(listed.body[0]).not.toHaveProperty('password')

    await member.agent.get('/tenants/users').expect(403)
    await member.agent
      .post(`/tenants/users/${member.id}/deactivate`)
      .expect(403)
    await member.agent
      .post(`/tenants/users/${member.id}/reactivate`)
      .expect(403)
    await member.agent.delete('/tenants/invite-codes/1').expect(403)
  })

  it('removes a member: signed out at once, history kept, then reactivated', async () => {
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const removed = await owner
      .post(`/tenants/users/${member.id}/deactivate`)
      .expect(200)
    expect(removed.body.isActive).toBe(false)

    await member.agent.get('/auth/me').expect(401)
    await member.agent.post('/auth/refresh').expect(401)
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: member.email, password: 'password-m' })
      .expect(401)
    const listed = await owner.get('/tenants/users').expect(200)
    expect(listed.body).toHaveLength(2)

    await owner.post(`/tenants/users/${member.id}/reactivate`).expect(200)
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: member.email, password: 'password-m' })
      .expect(200)
  })

  it('refuses to let the owner remove themself', async () => {
    const owner = await signUp(app)
    const me = await owner.get('/auth/me').expect(200)

    await owner.post(`/tenants/users/${me.body.user.id}/deactivate`).expect(409)
  })

  it("answers 404 for another tenant's user", async () => {
    const owner = await signUp(app)
    const stranger = await signUp(app)
    const strangerMe = await stranger.get('/auth/me').expect(200)

    await owner
      .post(`/tenants/users/${strangerMe.body.user.id}/deactivate`)
      .expect(404)
  })

  it('revokes a pending invite so it can no longer be redeemed', async () => {
    const owner = await signUp(app)
    const invite = await owner
      .post('/tenants/invite-codes')
      .send({ expiresInDays: 1 })
      .expect(201)

    await owner.delete(`/tenants/invite-codes/${invite.body.id}`).expect(204)

    await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({
        tenantCode: invite.body.code,
        name: 'Bia',
        email: uniqueEmail(),
        password: 'password-m',
      })
      .expect(409)
  })
})

describe('change password (e2e, #15)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('rejects a wrong current password with 400', async () => {
    const agent = await signUp(app)

    const response = await agent
      .post('/auth/password/change')
      .send({ currentPassword: 'wrong-pass', newPassword: 'password-new' })
      .expect(400)

    expect(response.body.message).toBe('Current password is incorrect.')
  })

  it('rejects a new password equal to the current one', async () => {
    const agent = await signUp(app)

    await agent
      .post('/auth/password/change')
      .send({ currentPassword: 'password-a', newPassword: 'password-a' })
      .expect(400)
  })

  it('changes it, keeps this session, and signs out every other one', async () => {
    const email = uniqueEmail()
    const here = await signUp(app, email)
    const elsewhere = request.agent(app.getHttpServer())
    await elsewhere
      .post('/auth/sign-in')
      .send({ email, password: 'password-a' })
      .expect(200)

    await here
      .post('/auth/password/change')
      .send({ currentPassword: 'password-a', newPassword: 'password-new' })
      .expect(200)

    await here.get('/auth/me').expect(200)
    await here.post('/auth/refresh').expect(200)
    await elsewhere.post('/auth/refresh').expect(401)
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email, password: 'password-new' })
      .expect(200)
  })

  it('allows 5 attempts per 15 minutes per user', async () => {
    const agent = await signUp(app)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await agent
        .post('/auth/password/change')
        .send({ currentPassword: 'wrong-pass', newPassword: 'password-new' })
        .expect(400)
    }

    await agent
      .post('/auth/password/change')
      .send({ currentPassword: 'password-a', newPassword: 'password-new' })
      .expect(429)
  })
})

/** The backfill `INSERT` of the tenant-settings migration, as it ships. */
function backfillStatement(): string {
  const drizzle = new URL('../../../packages/db/drizzle/', import.meta.url)
  const folder = readdirSync(drizzle).find((name) =>
    name.endsWith('_tenant-settings')
  )
  const migration = readFileSync(
    new URL(`${folder}/migration.sql`, drizzle),
    'utf8'
  )
  const statement = migration
    .split('--> statement-breakpoint')
    .find((part) => part.includes('INSERT INTO "tenant_settings"'))
  if (statement === undefined) {
    throw new Error('The tenant-settings migration has no backfill.')
  }

  return statement
}
