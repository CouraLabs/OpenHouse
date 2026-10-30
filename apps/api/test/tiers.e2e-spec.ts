import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  createAccount,
  createCategory,
  setTier,
  signUp,
  startApp,
  turnstileToken,
  uniqueEmail,
  type Agent,
} from './support.js'

async function tenantIdOf(agent: Agent): Promise<number> {
  return (await agent.get('/api/auth/me')).body.tenant.id
}

function monthsAgo(months: number): string {
  const now = new Date()

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 15)
  )
    .toISOString()
    .slice(0, 10)
}

describe('tenant tiers (e2e)', () => {
  it('creates new tenants on Free in production and reports the plan', async () => {
    const { app } = startApp()
    const agent = await signUp(app, uniqueEmail(), 'password-a', 0)

    const me = await agent.get('/api/auth/me')
    expect(me.body.tenant.tier).toBe(0)

    const status = await agent.get('/api/tiers/current')
    expect(status.status).toBe(200)
    expect(status.body.plan.name).toBe('Free')
    expect(status.body.usage.users).toBe(1)
    expect(status.body.transactionWindowStart).toMatch(/^\d{4}-\d{2}-01$/)
  })

  it('creates new tenants on Developer in development', async () => {
    const { app } = startApp({ ENVIRONMENT: 'development' })
    const response = await app.request(
      '/api/auth/sign-up',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantName: `t-${randomUUID()}`,
          name: 'Ana',
          email: uniqueEmail(),
          password: 'password-a',
        }),
      },
      app.bindings
    )

    expect(response.status).toBe(201)
    expect(((await response.json()) as any).tenant.tier).toBe(-1)
  })

  it('caps every CRUD at 2 items on Free and lets Plus go further', async () => {
    const { app } = startApp()
    const agent = await signUp(app, uniqueEmail(), 'password-a', 0)

    await createAccount(agent)
    await createAccount(agent)
    const third = await agent.post('/api/accounts', {
      name: `acc-${randomUUID()}`,
      type: 'Checking',
      balance: '0.00',
      currency: 'USD',
    })
    expect(third.status).toBe(403)
    expect(third.body).toMatchObject({
      code: 'tier_limit',
      limit: 'items',
      tier: 0,
    })

    await setTier(await tenantIdOf(agent), 1)
    await createAccount(agent)
  })

  it('allows one export a month on Free', async () => {
    const { app } = startApp()
    const agent = await signUp(app, uniqueEmail(), 'password-a', 0)

    const first = await agent.post('/api/categories/export', {
      locale: 'en-US',
    })
    expect(first.status).toBe(200)

    const second = await agent.post('/api/accounts/export', { locale: 'en-US' })
    expect(second.status).toBe(403)
    expect(second.body).toMatchObject({ code: 'tier_limit', limit: 'export' })

    const status = await agent.get('/api/tiers/current')
    expect(status.body.usage.exportsThisMonth).toBe(1)
  })

  it('keeps Free to one user: no invites, no redemptions', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const invite = await owner.post('/api/tenants/invite-codes', {
      expiresInDays: 7,
      turnstileToken: turnstileToken('invite'),
    })
    expect(invite.status).toBe(201)

    await setTier(await tenantIdOf(owner), 0)

    const refused = await owner.post('/api/tenants/invite-codes', {
      expiresInDays: 7,
      turnstileToken: turnstileToken('invite'),
    })
    expect(refused.status).toBe(403)
    expect(refused.body.limit).toBe('users')

    const redeemed = await app.request(
      '/api/auth/sign-up',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenantCode: invite.body.code,
          name: 'Bia',
          email: uniqueEmail(),
          password: 'password-m',
          turnstileToken: turnstileToken('signup'),
        }),
      },
      app.bindings
    )
    expect(redeemed.status).toBe(403)
  })

  it('hides transactions older than 3 months on Free, and shows them again on Plus', async () => {
    const { app } = startApp()
    const agent = await signUp(app)
    const accountId = await createAccount(agent)
    const categoryId = await createCategory(agent)
    const transaction = (transactionDt: string) => ({
      name: `tx-${randomUUID()}`,
      amount: '10.00',
      transactionDt,
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
    })

    const old = await agent.post('/api/transactions', transaction(monthsAgo(4)))
    expect(old.status).toBe(201)
    const recent = await agent.post(
      '/api/transactions',
      transaction(monthsAgo(0))
    )
    expect(recent.status).toBe(201)

    const tenantId = await tenantIdOf(agent)
    await setTier(tenantId, 0)

    const search = await agent.post('/api/transactions/search', {})
    expect(search.body.items.map((row: { id: number }) => row.id)).toEqual([
      recent.body.id,
    ])
    expect((await agent.get(`/api/transactions/${old.body.id}`)).status).toBe(
      404
    )

    const tooOld = await agent.post(
      '/api/transactions',
      transaction(monthsAgo(4))
    )
    expect(tooOld.status).toBe(403)
    expect(tooOld.body.limit).toBe('transaction_window')

    await setTier(tenantId, 1)

    const all = await agent.post('/api/transactions/search', {})
    expect(all.body.total).toBe(2)
  })
})
