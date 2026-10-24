import { z } from 'zod'

import type { Currency } from './currencies.js'
import type { LimitType } from './limits.js'
import type { TransactionType } from './transactions.js'

/**
 * The reminders contract: a user's notification preferences, the in-app
 * notification centre, the web push subscription, and the calendar feed.
 * There is no email channel yet (no mail server); the preferences are
 * channel flags, so an email flag is one more column later.
 */

/** How reminders reach the user: one message each, or one daily digest. */
export const reminderDeliveries = ['individual', 'digest'] as const

export type ReminderDelivery = (typeof reminderDeliveries)[number]

/** The longest lead time a reminder accepts, in days. */
export const MAX_LEAD_DAYS = 30

const leadDaysSchema = z
  .number({ error: 'Enter a number of days.' })
  .int('Enter a whole number of days.')
  .min(0, 'Enter 0 or more days.')
  .max(MAX_LEAD_DAYS, `Enter ${MAX_LEAD_DAYS} days or fewer.`)

/** The body `PUT notifications/preferences` accepts. */
export const notificationPreferencesSchema = z.object({
  /** The bell in the header. */
  inAppEnabled: z.boolean(),
  /** Web push to the user's subscribed browsers. */
  pushEnabled: z.boolean(),
  /** Whether a push payload carries amounts and names. Off by default: a
   * lock screen is a shared space in a household. */
  pushDetails: z.boolean(),
  /** Days before a card bill's due date the reminder is sent. */
  billLeadDays: leadDaysSchema,
  /** Days before a recurring expense fires the reminder is sent. */
  recurringLeadDays: leadDaysSchema,
  /** Alert when a limit reaches 80% of its cap. */
  limitAlert80: z.boolean(),
  /** Alert when a limit reaches 100% of its cap. */
  limitAlert100: z.boolean(),
  delivery: z.enum(reminderDeliveries, { error: 'Pick a delivery.' }),
})

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>

/** What a user who never opened the preferences gets. */
export const defaultNotificationPreferences: NotificationPreferences = {
  inAppEnabled: true,
  pushEnabled: true,
  pushDetails: false,
  billLeadDays: 3,
  recurringLeadDays: 1,
  limitAlert80: true,
  limitAlert100: true,
  delivery: 'individual',
}

/** A card bill coming due. */
export interface BillDueDetail {
  kind: 'bill_due'
  accountName: string
  statementId: number
  amount: string
  currency: Currency
  dueDate: string
  daysLeft: number
}

/** A card bill past its due date and still unpaid — sent once. */
export interface BillOverdueDetail {
  kind: 'bill_overdue'
  accountName: string
  statementId: number
  amount: string
  currency: Currency
  dueDate: string
}

/** A recurring rule about to fire. */
export interface RecurringDueDetail {
  kind: 'recurring_due'
  name: string
  ruleId: number
  amount: string
  currency: Currency
  type: TransactionType
  date: string
  daysLeft: number
}

/** A limit that reached 80% or 100% of its cap. */
export interface LimitAlertDetail {
  kind: 'limit_alert'
  categoryName: string
  limitId: number
  limitType: LimitType
  threshold: 80 | 100
  percent: number
  spent: string
  amount: string
  currency: Currency
}

export type ReminderDetail =
  BillDueDetail | BillOverdueDetail | RecurringDueDetail | LimitAlertDetail

/** What a notification says: one reminder, or a digest of several. */
export type NotificationBody =
  ReminderDetail | { kind: 'digest'; items: ReminderDetail[] }

/**
 * The JSON a push message carries to the service worker. Quiet by default:
 * with no `details` the message says only that something needs a look —
 * no amounts, no names, not even the kind. A user who opts in gets the
 * reminders themselves in `details`.
 */
export interface PushPayload {
  v: 1
  /** How many reminders the message stands for. */
  count: number
  /** Where tapping the message opens, a web route path. */
  url: string
  details?: NotificationBody[]
}

/** One entry of the notification centre. */
export interface AppNotification {
  id: number
  body: NotificationBody
  createdAt: string
  readAt: string | null
}

/** What `GET notifications` answers: the latest entries and the unread
 * count of all of them. */
export interface NotificationList {
  items: AppNotification[]
  unread: number
}

/** The push setup the browser reads: whether the server can push at all,
 * and the VAPID public key a subscription is made against. */
export interface PushConfig {
  enabled: boolean
  publicKey: string | null
}

/** The body `POST notifications/push-subscriptions` accepts: a browser's
 * `PushSubscription.toJSON()`. */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ error: 'The subscription needs an endpoint.' }).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
})

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionSchema>

/** The body `DELETE notifications/push-subscriptions` accepts. */
export const pushUnsubscribeSchema = z.object({
  endpoint: z.url().max(2048),
})

export type PushUnsubscribeBody = z.infer<typeof pushUnsubscribeSchema>

/** The calendar feed of the user, or nothing while none was created.
 * `path` is the API path of the `.ics` feed; its secret token is in it. */
export interface CalendarFeed {
  path: string | null
}
