import { randomUUID } from 'node:crypto'
import { createExecutionContext } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import {
  type Agent,
  confirmEmail,
  joinAsMember,
  signUp,
  startApp,
  TURNSTILE_TOKEN,
  uniqueEmail,
} from './support.js'
import type { TestApp } from './support.js'

/**
 * A fresh browser: no cookies until a response sets them. The raw client
 * the specs need when a flow starts signed out — a second sign-in, a
 * sign-up with fields `signUp` does not send.
 */
function freshBrowser(app: TestApp): Agent {
  const jar = { value: '' }

  async function send(
    path: string,
    init: RequestInit = {}
  ): Promise<{ status: number; body: any; headers: Headers }> {
    const response = await app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: new Headers({
          ...(init.headers ?? {}),
          ...(jar.value === '' ? {} : { cookie: jar.value }),
        }),
        redirect: 'manual',
      }),
      app.bindings,
      createExecutionContext()
    )

    // Collect every Set-Cookie the response asked for — the token pair of
    // a sign-in, or the cleared cookies of a sign-out.
    for (const setCookie of response.headers.getSetCookie?.() ?? []) {
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
      : (await response.text()) || null

    return { status: response.status, body, headers: response.headers }
  }

  const request = (
    path: string,
    init: { method?: string; body?: unknown } = {}
  ) =>
    send(path, {
      method: init.method ?? 'POST',
      ...(init.body === undefined
        ? {}
        : {
            body: JSON.stringify(init.body),
            headers: { 'content-type': 'application/json' },
          }),
    })

  return {
    request,
    get: (path) => send(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    delete: (path) => send(path, { method: 'DELETE' }),
    form: (path, formData) =>
      send(path, { method: 'POST', body: formData as never }),
  }
}

describe('tenant settings (e2e, #15)', () => {
  it('creates the settings row with the sign-up, from the browser zone and currency', async () => {
    const { app } = startApp()
    const browser = freshBrowser(app)

    const email = uniqueEmail()

    const created = await browser.post('/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email,
      password: 'password-a',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      turnstileToken: TURNSTILE_TOKEN,
    })
    expect(created.status).toBe(201)

    const confirmed = await confirmEmail(browser, email)
    expect(confirmed.body.settings).toEqual({
      timezone: 'America/Sao_Paulo',
      mainCurrency: 'BRL',
      timezoneConfirmed: true,
      unsplitMode: 'personal',
    })
    const me = await browser.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.settings.mainCurrency).toBe('BRL')
  })

  it('rejects a sign-up with an unknown time zone, creating nothing', async () => {
    const { app } = startApp()
    const browser = freshBrowser(app)

    const response = await browser.post('/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email: uniqueEmail(),
      password: 'password-a',
      timezone: 'Mars/Olympus_Mons',
      turnstileToken: TURNSTILE_TOKEN,
    })

    expect(response.status).toBe(400)
  })

  it('lets the owner save settings and rejects invalid ones with 400', async () => {
    const { app } = startApp()
    const owner = await signUp(app)

    const saved = await owner.put('/api/settings', {
      timezone: 'Europe/Lisbon',
      mainCurrency: 'EUR',
    })
    expect(saved.status).toBe(200)
    expect(saved.body).toEqual({
      timezone: 'Europe/Lisbon',
      mainCurrency: 'EUR',
      timezoneConfirmed: true,
      unsplitMode: 'personal',
    })

    const unknownZone = await owner.put('/api/settings', {
      timezone: 'Nowhere/City',
      mainCurrency: 'EUR',
    })
    expect(unknownZone.status).toBe(400)
    const unknownCurrency = await owner.put('/api/settings', {
      timezone: 'UTC',
      mainCurrency: 'JPY',
    })
    expect(unknownCurrency.status).toBe(400)
  })

  it('lets a member read the settings but not change them', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const read = await member.agent.get('/api/settings')
    expect(read.status).toBe(200)
    const refused = await member.agent.put('/api/settings', {
      timezone: 'UTC',
      mainCurrency: 'USD',
    })
    expect(refused.status).toBe(403)
  })
})

describe('users management (e2e, #15)', () => {
  it('lists the users and keeps every route owner-only', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const listed = await owner.get('/api/tenants/users')
    expect(listed.status).toBe(200)
    expect(listed.body.map((row: { role: string }) => row.role)).toEqual([
      'owner',
      'user',
    ])
    expect(listed.body[0]).not.toHaveProperty('password')

    const memberList = await member.agent.get('/api/tenants/users')
    expect(memberList.status).toBe(403)
    const memberDeactivate = await member.agent.post(
      `/api/tenants/users/${member.id}/deactivate`
    )
    expect(memberDeactivate.status).toBe(403)
    const memberReactivate = await member.agent.post(
      `/api/tenants/users/${member.id}/reactivate`
    )
    expect(memberReactivate.status).toBe(403)
    const memberRevoke = await member.agent.delete(
      '/api/tenants/invite-codes/1'
    )
    expect(memberRevoke.status).toBe(403)
  })

  it('removes a member: signed out at once, history kept, then reactivated', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const member = await joinAsMember(app, owner)

    const removed = await owner.post(
      `/api/tenants/users/${member.id}/deactivate`
    )
    expect(removed.status).toBe(200)
    expect(removed.body.isActive).toBe(false)

    const memberMe = await member.agent.get('/api/auth/me')
    expect(memberMe.status).toBe(401)
    const memberRefresh = await member.agent.post('/api/auth/refresh')
    expect(memberRefresh.status).toBe(401)
    const memberSignIn = await freshBrowser(app).post('/api/auth/sign-in', {
      email: member.email,
      password: 'password-m',
    })
    expect(memberSignIn.status).toBe(401)
    const listed = await owner.get('/api/tenants/users')
    expect(listed.status).toBe(200)
    expect(listed.body).toHaveLength(2)

    const reactivated = await owner.post(
      `/api/tenants/users/${member.id}/reactivate`
    )
    expect(reactivated.status).toBe(200)
    const backIn = await freshBrowser(app).post('/api/auth/sign-in', {
      email: member.email,
      password: 'password-m',
    })
    expect(backIn.status).toBe(200)
  })

  it('refuses to let the owner remove themself', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const me = await owner.get('/api/auth/me')
    expect(me.status).toBe(200)

    const refused = await owner.post(
      `/api/tenants/users/${me.body.user.id}/deactivate`
    )
    expect(refused.status).toBe(409)
  })

  it("answers 404 for another tenant's user", async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const stranger = await signUp(app)
    const strangerMe = await stranger.get('/api/auth/me')
    expect(strangerMe.status).toBe(200)

    const response = await owner.post(
      `/api/tenants/users/${strangerMe.body.user.id}/deactivate`
    )
    expect(response.status).toBe(404)
  })

  it('revokes a pending invite so it can no longer be redeemed', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const invite = await owner.post('/api/tenants/invite-codes', {
      expiresInDays: 1,
    })
    expect(invite.status).toBe(201)

    const revoked = await owner.delete(
      `/api/tenants/invite-codes/${invite.body.id}`
    )
    expect(revoked.status).toBe(204)

    const redeemed = await freshBrowser(app).post('/api/auth/sign-up', {
      tenantCode: invite.body.code,
      name: 'Bia',
      email: uniqueEmail(),
      password: 'password-m',
      turnstileToken: TURNSTILE_TOKEN,
    })
    expect(redeemed.status).toBe(409)
  })
})

describe('change password (e2e, #15)', () => {
  it('rejects a wrong current password with 400', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/auth/password/change', {
      currentPassword: 'wrong-pass',
      newPassword: 'password-new',
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe('Current password is incorrect.')
  })

  it('rejects a new password equal to the current one', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/auth/password/change', {
      currentPassword: 'password-a',
      newPassword: 'password-a',
    })

    expect(response.status).toBe(400)
  })

  it('changes it, keeps this session, and signs out every other one', async () => {
    const { app } = startApp()
    const email = uniqueEmail()
    const here = await signUp(app, email)
    const elsewhere = freshBrowser(app)
    const signedIn = await elsewhere.post('/api/auth/sign-in', {
      email,
      password: 'password-a',
    })
    expect(signedIn.status).toBe(200)

    const changed = await here.post('/api/auth/password/change', {
      currentPassword: 'password-a',
      newPassword: 'password-new',
    })
    expect(changed.status).toBe(200)

    const hereMe = await here.get('/api/auth/me')
    expect(hereMe.status).toBe(200)
    const hereRefresh = await here.post('/api/auth/refresh')
    expect(hereRefresh.status).toBe(200)
    const elsewhereRefresh = await elsewhere.post('/api/auth/refresh')
    expect(elsewhereRefresh.status).toBe(401)
    const newPassword = await freshBrowser(app).post('/api/auth/sign-in', {
      email,
      password: 'password-new',
    })
    expect(newPassword.status).toBe(200)
  })

  it('allows 5 attempts per 15 minutes per user', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = await agent.post('/api/auth/password/change', {
        currentPassword: 'wrong-pass',
        newPassword: 'password-new',
      })
      expect(wrong.status).toBe(400)
    }

    const throttled = await agent.post('/api/auth/password/change', {
      currentPassword: 'password-a',
      newPassword: 'password-new',
    })
    expect(throttled.status).toBe(429)
  })
})
