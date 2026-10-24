import { vi } from 'vitest'
import type { NotificationBody } from '@workspace/poco'

import type { LogKey } from './notification-log.repository.js'
import type { NotificationLogRepository } from './notification-log.repository.js'
import type { NotificationRepository } from './notification.repository.js'
import type { Recipient } from './notification-preferences.repository.js'
import { preferences } from './reminder-fixtures.js'
import { ReminderDeliveryService } from './reminder-delivery.service.js'
import type { ReminderCandidate } from './reminder-rules.js'
import type { PushService } from './push.service.js'

/**
 * An in-memory twin of the `notification_log` unique index: `claim` wins
 * once per `(userId, kind, refId, dueDate)`, exactly like the database's
 * `ON CONFLICT DO NOTHING`. A transaction that throws gives its claims
 * back, like a rolled-back one.
 */
function fakeLog() {
  const taken = new Set<string>()
  const claim = async (key: LogKey) => {
    const id = [key.userId, key.kind, key.refId, key.dueDate].join('|')

    if (taken.has(id)) {
      return false
    }

    taken.add(id)
    return true
  }

  return {
    taken,
    claim: vi.fn(claim),
    transaction: async <T>(work: (tx: unknown) => Promise<T>): Promise<T> => {
      const before = new Set(taken)

      try {
        return await work({})
      } catch (error) {
        taken.clear()
        for (const id of before) {
          taken.add(id)
        }
        throw error
      }
    },
  }
}

const overdue: ReminderCandidate = {
  key: { kind: 'bill_overdue', refId: 7, dueDate: '2026-10-30' },
  detail: {
    kind: 'bill_overdue',
    accountName: 'Nubank',
    statementId: 7,
    amount: '300.00',
    currency: 'BRL',
    dueDate: '2026-10-30',
  },
}

const rent: ReminderCandidate = {
  key: { kind: 'recurring_due', refId: 1, dueDate: '2026-11-03' },
  detail: {
    kind: 'recurring_due',
    name: 'Landlord',
    ruleId: 1,
    amount: '1500.00',
    currency: 'BRL',
    type: 'Expense',
    date: '2026-11-03',
    daysLeft: 1,
  },
}

const limitAlert: ReminderCandidate = {
  key: { kind: 'limit_80', refId: 3, dueDate: '2026-11-01' },
  detail: {
    kind: 'limit_alert',
    categoryName: 'Groceries',
    limitId: 3,
    limitType: 'Monthly',
    threshold: 80,
    percent: 85,
    spent: '850.00',
    amount: '1000.00',
    currency: 'BRL',
  },
}

function build(overrides: Partial<Recipient['preferences']> = {}) {
  const log = fakeLog()
  const stored: NotificationBody[] = []
  const notify = vi.fn().mockResolvedValue(1)
  const service = new ReminderDeliveryService(
    log as unknown as NotificationLogRepository,
    {
      insert: async (
        _tx: unknown,
        _t: number,
        _u: number,
        body: NotificationBody
      ) => {
        stored.push(body)
      },
    } as unknown as NotificationRepository,
    {
      config: () => ({ enabled: true, publicKey: 'k' }),
      hasSubscriptions: async () => true,
      notify,
    } as unknown as PushService
  )
  const recipient: Recipient = {
    tenantId: 1,
    userId: 10,
    preferences: preferences(overrides),
  }

  return { service, recipient, stored, notify, log }
}

describe('ReminderDeliveryService idempotency (the log index claim)', () => {
  it('delivers a reminder once, however often the run repeats', async () => {
    const { service, recipient, stored, notify } = build()

    const first = await service.deliver(recipient, [overdue], '2026-11-02')
    // A restart, or a second replica, runs the same evaluation again.
    const second = await service.deliver(recipient, [overdue], '2026-11-02')
    const nextDay = await service.deliver(recipient, [overdue], '2026-11-03')

    expect([first, second, nextDay]).toEqual([1, 0, 0])
    expect(stored).toHaveLength(1)
    expect(notify).toHaveBeenCalledTimes(1)
  })

  it('lets two concurrent runs split nothing: one wins each key', async () => {
    const { service, recipient, stored } = build()

    const results = await Promise.all([
      service.deliver(recipient, [overdue, rent], '2026-11-02'),
      service.deliver(recipient, [overdue, rent], '2026-11-02'),
    ])

    expect(results.reduce((sum, count) => sum + count, 0)).toBe(2)
    expect(stored).toHaveLength(2)
  })

  it('claims only what is new when a later run adds a reminder', async () => {
    const { service, recipient, stored } = build()

    await service.deliver(recipient, [overdue], '2026-11-02')
    await service.deliver(recipient, [overdue, rent], '2026-11-02')

    expect(stored.map((body) => body.kind)).toEqual([
      'bill_overdue',
      'recurring_due',
    ])
  })

  it('claims nothing while no channel could receive it', async () => {
    const { service, recipient, log } = build({
      inAppEnabled: false,
      pushEnabled: false,
    })

    expect(await service.deliver(recipient, [overdue], '2026-11-02')).toBe(0)
    expect(log.taken.size).toBe(0)
  })
})

describe('ReminderDeliveryService digest', () => {
  it('bundles the day into one digest and sends one per day', async () => {
    const { service, recipient, stored } = build({ delivery: 'digest' })

    await service.deliver(recipient, [overdue, rent], '2026-11-02')
    const sameDay = await service.deliver(recipient, [limitAlert], '2026-11-02')

    expect(sameDay).toBe(0)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ kind: 'digest' })
    expect(stored[0].kind === 'digest' && stored[0].items).toHaveLength(2)
  })

  it('leaves a held-back item for the next day digest', async () => {
    const { service, recipient, stored } = build({ delivery: 'digest' })
    await service.deliver(recipient, [overdue], '2026-11-02')
    await service.deliver(recipient, [limitAlert], '2026-11-02')
    const nextDay = await service.deliver(recipient, [limitAlert], '2026-11-03')

    expect(nextDay).toBe(1)
    expect(stored).toHaveLength(2)
  })
})
