import { vi } from 'vitest'
import type {
  NotificationPreferencesRepository,
  SettingsRepository,
} from '@workspace/db'
import { defaultNotificationPreferences } from '@workspace/dto'

import type { Clock } from '../ports/clock.js'
import type {
  BillSource,
  LimitSource,
  RecurringSource,
} from '../ports/upcoming-sources.js'
import type { ReminderDeliveryService } from './reminder-delivery.service.js'
import { bill } from './reminder-fixtures.js'
import {
  ReminderRunService,
  type ReminderSources,
} from './reminder-run.service.js'

const SAO_PAULO = 'America/Sao_Paulo'

function build(now: string, timezone: string) {
  const deliver = vi.fn().mockResolvedValue(0)
  const sources: ReminderSources = {
    bills: {
      pendingBills: vi
        .fn()
        .mockResolvedValue([bill({ dueDate: '2026-11-05', status: 'Closed' })]),
    } as unknown as BillSource,
    recurring: {
      activeRules: vi.fn().mockResolvedValue([]),
      generatedOn: vi.fn().mockResolvedValue(new Set()),
    } as unknown as RecurringSource,
    limits: { usage: vi.fn().mockResolvedValue([]) } as unknown as LimitSource,
    delivery: { deliver } as unknown as ReminderDeliveryService,
  }
  const service = new ReminderRunService(
    {
      listRecipients: vi.fn().mockResolvedValue([
        {
          tenantId: 1,
          userId: 10,
          preferences: defaultNotificationPreferences,
        },
      ]),
    } as unknown as NotificationPreferencesRepository,
    {
      timezonesOf: vi.fn().mockResolvedValue(new Map([[1, timezone]])),
    } as unknown as SettingsRepository,
    sources,
    { now: () => new Date(now) } as Clock
  )

  return { service, deliver }
}

function delivered(deliver: ReturnType<typeof vi.fn>) {
  const [, candidates, today] = deliver.mock.calls[0] as [
    unknown,
    Array<{ key: { kind: string } }>,
    string,
  ]

  return { kinds: candidates.map((candidate) => candidate.key.kind), today }
}

describe('ReminderRunService in the tenant time zone', () => {
  it('does not fire at 23:30 local on Nov 1, though UTC is already Nov 2', async () => {
    const { service, deliver } = build('2026-11-02T02:30:00.000Z', SAO_PAULO)

    await service.run()

    expect(delivered(deliver)).toEqual({ kinds: [], today: '2026-11-01' })
  })

  it('fires once the tenant morning of Nov 2 arrives', async () => {
    const { service, deliver } = build('2026-11-02T11:30:00.000Z', SAO_PAULO)

    await service.run()

    expect(delivered(deliver)).toEqual({
      kinds: ['bill_due'],
      today: '2026-11-02',
    })
  })

  it('stays quiet in the small hours even once the local day has changed', async () => {
    const { service, deliver } = build('2026-11-02T03:30:00.000Z', SAO_PAULO)

    await service.run()

    expect(deliver).not.toHaveBeenCalled()
  })

  it('judges a UTC tenant by its own day', async () => {
    const { service, deliver } = build('2026-11-02T02:30:00.000Z', 'UTC')

    await service.run()

    expect(deliver).not.toHaveBeenCalled()
  })
})
