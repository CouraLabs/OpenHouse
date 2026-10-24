import type { INestApplication } from '@nestjs/common'
import { getDrizzleToken } from '@nestjs/drizzle'
import { Test } from '@nestjs/testing'
import type { Database } from '@workspace/db'
import { notificationLog } from '@workspace/db'
import {
  shiftDay,
  todayIn,
  type CalendarFeed,
  type NotificationList,
  type UpcomingResponse,
} from '@workspace/poco'
import cookieParser from 'cookie-parser'
import { eq } from 'drizzle-orm'
import request from 'supertest'
import type { App } from 'supertest/types.js'

import { AppModule } from '../src/app.module.js'
import { Clock } from '../src/common/clock/clock.js'
import { NotificationLogRepository } from '../src/notifications/notification-log.repository.js'
import { ReminderRunService } from '../src/notifications/reminder-run.service.js'
import { type Agent, createAccount, createCategory, signUp } from './support.js'

/** Noon UTC today: past the reminders' send hour for a UTC tenant. */
const NOW = new Date(`${todayIn('UTC')}T12:00:00.000Z`)
const TODAY = todayIn('UTC', NOW)
const TOMORROW = shiftDay(TODAY, 1)

describe('upcoming bills, projected balance and reminders (e2e, #13)', () => {
  let app: INestApplication<App>
  let agent: Agent
  let tenantId: number
  let accountId: number

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Clock)
      .useValue({ now: () => NOW })
      .compile()

    app = moduleFixture.createNestApplication()
    app.use(cookieParser())
    await app.init()

    agent = await signUp(app)
    const me = await agent.get('/auth/me').expect(200)
    tenantId = me.body.tenant.id

    // 100.00 in the bank; rent of 250.00 falls due tomorrow.
    accountId = await createAccount(agent, { balance: '100.00' })
    const categoryId = await createCategory(agent)
    const receiver = await agent
      .post('/receivers')
      .send({ name: 'Landlord', type: 'Service' })
      .expect(201)

    await agent
      .post('/recurring-transactions')
      .send({
        receiverId: receiver.body.id,
        categoryId,
        linkedAccountId: accountId,
        amount: '250.00',
        type: 'Expense',
        frequency: 'Monthly',
        frequencyDay: Number(TOMORROW.slice(8)),
      })
      .expect(201)

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
    await agent
      .post('/transactions')
      .send({
        name: 'Purchase',
        amount: '100.00',
        transactionDt: TODAY,
        linkedAccountId: card,
        categoryId,
        type: 'Expense',
      })
      .expect(201)
  })

  afterAll(async () => {
    await app.close()
  })

  it('merges the sources and flags the first negative day', async () => {
    const { body } = await agent.get('/upcoming?days=90').expect(200)
    const upcoming = body as UpcomingResponse

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
    await agent.get('/upcoming?days=0').expect(400)
    await agent.get('/upcoming?days=9999').expect(400)
  })

  it('claims a reminder once in the log index, across repeated runs', async () => {
    const reminders = app.get(ReminderRunService)

    // The default lead time is one day: the rent due tomorrow is due now.
    await reminders.run(tenantId)
    await reminders.run(tenantId)

    const { body } = await agent.get('/notifications').expect(200)
    const centre = body as NotificationList

    expect(centre.unread).toBe(1)
    expect(centre.items).toHaveLength(1)
    expect(centre.items[0].body).toMatchObject({
      kind: 'recurring_due',
      amount: '250.00',
      date: TOMORROW,
    })

    const db = app.get<Database>(getDrizzleToken())
    const logged = await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.tenantId, tenantId))

    expect(logged).toHaveLength(1)

    // The unique index itself: the same key is refused to a second claimer.
    const log = app.get(NotificationLogRepository)
    const key = {
      tenantId,
      userId: logged[0].userId,
      kind: 'recurring_due' as const,
      refId: logged[0].refId,
      dueDate: logged[0].dueDate,
    }

    expect(await log.claim(key)).toBe(false)
    expect(await log.claim({ ...key, refId: key.refId + 1 })).toBe(true)
  })

  it('marks notifications read', async () => {
    await agent.post('/notifications/read-all').expect(204)

    const { body } = await agent.get('/notifications').expect(200)

    expect((body as NotificationList).unread).toBe(0)
  })

  it('saves per-user preferences and validates them', async () => {
    const defaults = await agent.get('/notifications/preferences').expect(200)

    expect(defaults.body).toMatchObject({
      inAppEnabled: true,
      pushDetails: false,
      billLeadDays: 3,
      recurringLeadDays: 1,
      delivery: 'individual',
    })

    const saved = await agent
      .put('/notifications/preferences')
      .send({ ...defaults.body, billLeadDays: 5, pushDetails: true })
      .expect(200)

    expect(saved.body).toMatchObject({ billLeadDays: 5, pushDetails: true })
    await agent
      .put('/notifications/preferences')
      .send({ ...defaults.body, billLeadDays: 99 })
      .expect(400)
  })

  it('reports push disabled without VAPID keys and stores subscriptions', async () => {
    const config = await agent.get('/notifications/push-config').expect(200)

    expect(config.body).toEqual({ enabled: false, publicKey: null })

    const subscription = {
      endpoint: 'https://push.example.test/abc',
      keys: { p256dh: 'p', auth: 'a' },
    }

    await agent
      .post('/notifications/push-subscriptions')
      .send(subscription)
      .expect(204)
    await agent
      .delete('/notifications/push-subscriptions')
      .send({ endpoint: subscription.endpoint })
      .expect(204)
  })

  it('serves a secret .ics feed that rotates and deletes', async () => {
    expect((await agent.get('/calendar/feed')).body).toEqual({ path: null })

    const created = (await agent.post('/calendar/feed').expect(201))
      .body as CalendarFeed
    const path = created.path as string

    // No cookies: the token alone authorizes the calendar app.
    const feed = await request(app.getHttpServer()).get(path).expect(200)

    expect(feed.headers['content-type']).toContain('text/calendar')
    expect(feed.text).toContain('BEGIN:VCALENDAR')
    expect(feed.text).toContain('SUMMARY:Landlord')
    expect(feed.text).toContain('Amount due: 100.00 USD')

    const rotated = (await agent.post('/calendar/feed').expect(201))
      .body as CalendarFeed

    expect(rotated.path).not.toBe(path)
    await request(app.getHttpServer()).get(path).expect(404)
    await request(app.getHttpServer())
      .get(rotated.path as string)
      .expect(200)

    await agent.delete('/calendar/feed').expect(204)
    await request(app.getHttpServer())
      .get(rotated.path as string)
      .expect(404)
  })
})
