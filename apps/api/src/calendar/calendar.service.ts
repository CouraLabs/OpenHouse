import {
  forecastOccurrences,
  shiftDay,
  todayIn,
  type CalendarFeed,
} from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import { NotFoundError } from '../common/errors.js'
import {
  BillSource,
  RecurringSource,
} from '../common/upcoming/upcoming-sources.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { CalendarFeedRepository } from './calendar-feed.repository.js'
import { buildIcs, type IcsEvent } from './ics.js'

const FEED_DAYS = 90

function feedPath(token: string): string {
  return `/calendar/${token}.ics`
}

function base64UrlOf(bytes: Uint8Array): string {
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export class CalendarService {
  constructor(
    private readonly feeds: CalendarFeedRepository,
    private readonly bills: BillSource,
    private readonly recurring: RecurringSource,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  async find(userId: number): Promise<CalendarFeed> {
    const token = await this.feeds.findToken(userId)

    return { path: token === undefined ? null : feedPath(token) }
  }

  async rotate(tenantId: number, userId: number): Promise<CalendarFeed> {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const token = base64UrlOf(bytes)

    await this.feeds.save(tenantId, userId, token)

    return { path: feedPath(token) }
  }

  remove(userId: number): Promise<void> {
    return this.feeds.remove(userId)
  }

  async render(token: string): Promise<string> {
    const owner = await this.feeds.findOwner(token)
    const settings =
      owner === undefined
        ? undefined
        : await this.settings.findByTenant(owner.tenantId)

    if (owner === undefined || settings === undefined) {
      throw new NotFoundError('No such calendar.')
    }

    const now = this.clock.now()
    const today = todayIn(settings.timezone, now)
    const end = shiftDay(today, FEED_DAYS)
    const [bills, rules] = await Promise.all([
      this.bills.pendingBills(owner.tenantId, end),
      this.recurring.activeRules(owner.tenantId),
    ])
    const events: IcsEvent[] = [
      ...bills.map((bill) => ({
        uid: `bill-${bill.id}@openhouse`,
        date: bill.dueDate,
        summary: `${bill.accountName} bill due`,
        description: `Amount due: ${bill.amountDue} ${bill.currency}${bill.status === 'Open' ? ' (estimate, the bill is still open)' : ''}`,
      })),
      ...forecastOccurrences(
        rules.filter((rule) => rule.frequency !== 'Daily'),
        today,
        end
      ).map(({ date, rule }) => ({
        uid: `recurring-${rule.id}-${date}@openhouse`,
        date,
        summary: rule.receiverName,
        description: `${rule.type === 'Income' ? 'Income' : 'Expense'}: ${rule.amount} ${rule.accountCurrency}`,
      })),
    ]

    return buildIcs(events, now, 'OpenHouse upcoming')
  }
}
