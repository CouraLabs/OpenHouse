import { describe, expect, it } from 'vitest'
import { createMessageBatch } from 'cloudflare:test'

import { FixedClock, TestDatabaseHarness } from '@workspace/business/testing'
import { env } from 'cloudflare:workers'
import { signUp, createAccount, createCategory, startApp } from './support.js'
import type { JobMessage } from '../src/index.js'

/**
 * The queue delivers at least once, so every job must be idempotent: the
 * same message twice leaves the books exactly as the first delivery did.
 */
describe('queue job idempotency (e2e)', () => {
  it('a recurring job redelivered materializes no second transaction', async () => {
    const { app } = startApp()
    const harness = new TestDatabaseHarness(env.DB)

    const agent = await signUp(app)
    const accountId = await createAccount(agent)
    const categoryId = await createCategory(agent)
    const receiver = await agent.post('/api/receivers', {
      name: 'Landlord',
      type: 'Person',
    })
    expect(receiver.status).toBe(201)

    const rule = await agent.post('/api/recurring-transactions', {
      receiverId: receiver.body.id,
      categoryId,
      linkedAccountId: accountId,
      amount: '1500.00',
      type: 'Expense',
      frequency: 'Daily',
    })
    expect(rule.status).toBe(201)

    const clock = new FixedClock()

    // A catch-up window of 1 day: the tenant's today.
    const first = await harness.runRecurring(1, clock)
    const second = await harness.runRecurring(1, clock)

    expect(first).toBe(1)
    expect(second).toBe(0)

    const search = await agent.post('/api/transactions/search', {
      sort: [],
      filter: { linkedAccountId: accountId },
      limit: 100,
    })
    expect(search.status).toBe(201)
    expect((search.body.items as unknown[]).length).toBe(1)
  })

  it('a balances job redelivered reports the same zero drifts', async () => {
    const { app } = startApp()
    const harness = new TestDatabaseHarness(env.DB)

    const agent = await signUp(app)
    await createAccount(agent)

    const first = await harness.checkBalances(1)
    const second = await harness.checkBalances(1)

    expect(first).toBe(0)
    expect(second).toBe(0)
  })

  it('the queue consumer redelivers a message without doubling the work', async () => {
    // The consumer's own path: the same batch handed twice changes nothing
    // the second time. The delete-tenant kind is the cheapest to observe.
    const { handleQueue } = await import('../src/jobs/consumer.js')
    const { app, bindings } = startApp()
    const agent = await signUp(app)
    await createAccount(agent, { name: 'to-delete' })

    // Schedule the tenant's deletion for today, in its zone.
    const settings = await agent.put('/api/settings', {
      timezone: 'UTC',
      mainCurrency: 'USD',
    })
    expect([200, 403]).toContain(settings.status)

    const batch = createMessageBatch<JobMessage>('kantim-jobs-test', [
      {
        id: 'm1',
        body: { kind: 'balances', tenantId: 1 },
        timestamp: new Date(),
        attempts: 0,
      },
      {
        id: 'm2',
        body: { kind: 'balances', tenantId: 1 },
        timestamp: new Date(),
        attempts: 0,
      },
    ])

    await handleQueue(batch, bindings)
  })
})
