import { vi } from 'vitest'
import type { PushSubscriptionRow } from '@workspace/db'
import type { NotificationBody, ReminderDetail } from '@workspace/poco'

import { buildPushPayload } from './push-payload.js'
import { PushRejectedError, type PushTransport } from './push-transport.js'
import type { PushSubscriptionRepository } from './push-subscription.repository.js'
import { PushService } from './push.service.js'

const subscription = (id: number): PushSubscriptionRow => ({
  id,
  tenantId: 1,
  userId: 10,
  endpoint: `https://push.example/${id}`,
  p256dh: 'p',
  auth: 'a',
  userAgent: null,
  createdAt: new Date(),
})

const body: ReminderDetail = {
  kind: 'bill_overdue',
  accountName: 'Nubank',
  statementId: 7,
  amount: '300.00',
  currency: 'BRL',
  dueDate: '2026-10-30',
}

function build(send: PushTransport['send']) {
  const deleteById = vi.fn().mockResolvedValue(undefined)
  const service = new PushService(
    {
      listByUser: async () => [subscription(1), subscription(2)],
      deleteById,
    } as unknown as PushSubscriptionRepository,
    { enabled: true, publicKey: 'k', send } as PushTransport
  )

  return { service, deleteById }
}

describe('PushService dead subscriptions', () => {
  it.each([404, 410])('deletes the subscription on a %i', async (status) => {
    const { service, deleteById } = build(async (target) => {
      if (target.endpoint.endsWith('/1')) {
        throw new PushRejectedError(status, 'gone')
      }
    })

    const delivered = await service.notify(10, [body], false)

    expect(delivered).toBe(1)
    expect(deleteById).toHaveBeenCalledExactlyOnceWith(1)
  })

  it('keeps the subscription on any other failure', async () => {
    const { service, deleteById } = build(async () => {
      throw new PushRejectedError(500, 'push service down')
    })

    expect(await service.notify(10, [body], false)).toBe(0)
    expect(deleteById).not.toHaveBeenCalled()
  })
})

describe('buildPushPayload', () => {
  it('is quiet by default: no amount, no name, not even the kind', () => {
    const payload = buildPushPayload([body], false)
    const text = JSON.stringify(payload)

    expect(payload).toEqual({ v: 1, count: 1, url: '/upcoming' })
    expect(text).not.toContain('300')
    expect(text).not.toContain('Nubank')
    expect(text).not.toContain('overdue')
  })

  it('carries the reminders only on opt-in, and counts a digest by its items', () => {
    const digest: NotificationBody = { kind: 'digest', items: [body, body] }

    expect(buildPushPayload([digest], true)).toEqual({
      v: 1,
      count: 2,
      url: '/upcoming',
      details: [digest],
    })
  })
})
