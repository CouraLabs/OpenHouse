import { randomBytes } from 'node:crypto'

import { Injectable, NotFoundException } from '@nestjs/common'
import {
  forecastOccurrences,
  shiftDay,
  todayIn,
  type CalendarFeed,
} from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import {
  BillSource,
  RecurringSource,
} from '../common/upcoming/upcoming-sources.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { CalendarFeedRepository } from './calendar-feed.repository.js'
import { buildIcs, type IcsEvent } from './ics.js'

/** How many days ahead the feed lists bills and recurring items. */
const FEED_DAYS = 90

/** The path the feed is served from, for a token. */
function feedPath(token: string): string {
  return `/calendar/${token}.ics`
}

/**
 * The per-user calendar feed: a secret `.ics` URL listing the tenant's
 * pending card bills and recurring items as all-day events, for Google or
 * Apple Calendar to subscribe to. The token is the only credential; a new
 * one replaces the old, which stops working.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly feeds: CalendarFeedRepository,
    private readonly bills: BillSource,
    private readonly recurring: RecurringSource,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  /** The user's feed, or nothing while none was created. */
  async find(userId: number): Promise<CalendarFeed> {
    const token = await this.feeds.findToken(userId)

    return { path: token === undefined ? null : feedPath(token) }
  }

  /** Creates the user's feed, or rotates its token. */
  async rotate(tenantId: number, userId: number): Promise<CalendarFeed> {
    const token = randomBytes(32).toString('base64url')

    await this.feeds.save(tenantId, userId, token)

    return { path: feedPath(token) }
  }

  /** Deletes the user's feed. */
  remove(userId: number): Promise<void> {
    return this.feeds.remove(userId)
  }

  /** Renders the feed a token names; 404 for an unknown token. */
  async render(token: string): Promise<string> {
    const owner = await this.feeds.findOwner(token)
    const settings =
      owner === undefined
        ? undefined
        : await this.settings.findByTenant(owner.tenantId)

    if (owner === undefined || settings === undefined) {
      throw new NotFoundException('No such calendar.')
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
      // A Daily rule would fill the calendar with one event a day.
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
