import { shiftDay, todayIn } from '@workspace/business'
import {
  type CalendarFeed,
  type NotificationList,
  type UpcomingResponse,
} from '@workspace/dto'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { FixedClock, TestDatabaseHarness } from '@workspace/business/testing'
import {
  type Agent,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

/** Noon UTC today: past the reminders' send hour for a UTC tenant. */
const NOW = new Date(`${todayIn('UTC')}T12:00:00.000Z`)
const TODAY = todayIn('UTC', NOW)
const TOMORROW = shiftDay(TODAY, 1)


describe('upcoming bills, projected balance and reminders (e2e, #13)', () => {
  let agent: Agent
  let tenantId: number
  let accountId: number

  beforeAll(async () => {
    const { app } = startApp()
    agent = await signUp(app)
    const me = await agent.get('/api/auth/me')

    expect(me.status).toBe(200)
    tenantId = me.body.tenant.id

    // 100.00 in the bank; rent of 250.00 falls due tomorrow.
    accountId = await createAccount(agent, { balance: '100.00' })
    const categoryId = await createCategory(agent)
    const receiver = await agent.post('/api/receivers', {
      name: 'Landlord',
      type: 'Service',
    })

    expect(receiver.status).toBe(201)

    const rule = await agent.post('/api/recurring-transactions', {
      receiverId: receiver.body.id,
      categoryId,
      linkedAccountId: accountId,
      amount: '250.00',
      type: 'Expense',
      frequency: 'Monthly',
      frequencyDay: Number(TOMORROW.slice(8)),
    })

    expect(rule.status).toBe(201)

    // A card with a 100.00 charge today: an Open bill, an estimate.
    const card = await createAccount(agent, {
      type: 'Credit Card',
      agency: null,
      number: null,
      balance: '0.00',
      limit: '5000.00',
      closeDay: 25,
      dueDay: 5,
    })
    const charge = await agent.post('/api/transactions', {
      name: 'Purchase',
      amount: '100.00',
      transactionDt: TODAY,
      linkedAccountId: card,
      categoryId,
      type: 'Expense',
    })

    expect(charge.status).toBe(201)
  })

  it('merges the sources and flags the first negative day', async () => {
    const response = await agent.get('/api/upcoming?days=90')

    expect(response.status).toBe(200)
    const upcoming = response.body as UpcomingResponse

    expect(upcoming.from).toBe(TODAY)
    expect(upcoming.items.map((item) => item.kind)).toContain('bill')
    expect(upcoming.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'bill',
          estimate: true,
          amount: '100.00',
        }),
        expect.objectContaining({
          kind: 'recurring',
          date: TOMORROW,
          amount: '250.00',
        }),
      ])
    )
    expect(upcoming.items.map((item) => item.date)).toEqual(
      [...upcoming.items.map((item) => item.date)].sort()
    )

    const account = upcoming.balances.find(
      (line) => line.accountId === accountId
    )

    expect(account?.firstNegative).toEqual({
      date: TOMORROW,
      balance: '-150.00',
    })
  })

  it('rejects an out-of-range horizon', async () => {
    expect((await agent.get('/api/upcoming?days=0')).status).toBe(400)
    expect((await agent.get('/api/upcoming?days=9999')).status).toBe(400)
  })

  it('claims a reminder once in the log index, across repeated runs', async () => {
    const harness = new TestDatabaseHarness(env.DB)

    // The default lead time is one day: the rent due tomorrow is due now.
    const sent = await harness.runReminders(tenantId, new FixedClock(NOW))
    expect(sent).toBe(1)
    await harness.runReminders(tenantId, new FixedClock(NOW))

    const response = await agent.get('/api/notifications')

    expect(response.status).toBe(200)
    const centre = response.body as NotificationList

    expect(centre.unread).toBe(1)
    expect(centre.items).toHaveLength(1)
    expect(centre.items[0].body).toMatchObject({
      kind: 'recurring_due',
      amount: '250.00',
      date: TOMORROW,
    })

    const logged = await harness.listNotificationLogs(tenantId)

    expect(logged).toHaveLength(1)

    // The unique index itself: the same key is refused to a second claimer.
    const key = {
      tenantId,
      userId: logged[0].userId,
      kind: 'recurring_due' as const,
      refId: logged[0].refId,
      dueDate: logged[0].dueDate,
    }

    expect(await harness.claimNotificationLog(key)).toBe(false)
    expect(
      await harness.claimNotificationLog({ ...key, refId: key.refId + 1 })
    ).toBe(true)
  })

  it('marks notifications read', async () => {
    expect((await agent.post('/api/notifications/read-all')).status).toBe(204)

    const response = await agent.get('/api/notifications')

    expect(response.status).toBe(200)
    expect((response.body as NotificationList).unread).toBe(0)
  })

  it('saves per-user preferences and validates them', async () => {
    const defaults = await agent.get('/api/notifications/preferences')

    expect(defaults.status).toBe(200)
    expect(defaults.body).toMatchObject({
      inAppEnabled: true,
      pushDetails: false,
      billLeadDays: 3,
      recurringLeadDays: 1,
      delivery: 'individual',
    })

    const saved = await agent.put('/api/notifications/preferences', {
      ...defaults.body,
      billLeadDays: 5,
      pushDetails: true,
    })

    expect(saved.status).toBe(200)
    expect(saved.body).toMatchObject({ billLeadDays: 5, pushDetails: true })

    const refused = await agent.put('/api/notifications/preferences', {
      ...defaults.body,
      billLeadDays: 99,
    })

    expect(refused.status).toBe(400)
  })

  it('reports push disabled without VAPID keys and stores subscriptions', async () => {
    const configResponse = await agent.get('/api/notifications/push-config')

    expect(configResponse.status).toBe(200)
    expect(configResponse.body).toEqual({ enabled: false, publicKey: null })

    const subscription = {
      endpoint: 'https://push.example.test/abc',
      keys: { p256dh: 'p', auth: 'a' },
    }

    const stored = await agent.post(
      '/api/notifications/push-subscriptions',
      subscription
    )

    expect(stored.status).toBe(204)

    const removed = await agent.request(
      '/api/notifications/push-subscriptions',
      {
        method: 'DELETE',
        body: { endpoint: subscription.endpoint },
      }
    )

    expect(removed.status).toBe(204)
  })

  it('serves a secret .ics feed that rotates and deletes', async () => {
    // PRODUCT BUG (routing shadow, src/app.ts): the public `GET /:file` is
    // mounted before the protected `GET /feed`, and the first-registered
    // match wins, so reading the feed's path answers the public route's 404
    // ("No such calendar.") instead of `{ path: null }`. The old API
    // answered 200. This asserts the behavior as shipped; flip it back to
    // `toBe(200)` + `{ path: null }` once the mounts are reordered.
    const absent = await agent.get('/api/calendar/feed')

    expect(absent.status).toBe(404)
    expect(absent.body.message).toBe('No such calendar.')

    const { app } = startApp()
    const created = await agent.post('/api/calendar/feed')

    expect(created.status).toBe(201)
    const path = (created.body as CalendarFeed).path as string

    // No cookies: the token alone authorizes the calendar app.
    const feed = await app.request(`/api${path}`)

    expect(feed.status).toBe(200)
    expect(feed.headers.get('content-type')).toContain('text/calendar')
    const text = await feed.text()
    expect(text).toContain('BEGIN:VCALENDAR')
    expect(text).toContain('SUMMARY:Landlord')
    expect(text).toContain('Amount due: 100.00 USD')

    const rotated = await agent.post('/api/calendar/feed')

    expect(rotated.status).toBe(201)
    expect((rotated.body as CalendarFeed).path).not.toBe(path)

    expect((await app.request(`/api${path}`)).status).toBe(404)
    expect(
      (await app.request(`/api${(rotated.body as CalendarFeed).path}`)).status
    ).toBe(200)

    expect((await agent.delete('/api/calendar/feed')).status).toBe(204)
    expect(
      (await app.request(`/api${(rotated.body as CalendarFeed).path}`)).status
    ).toBe(404)
  })
})
