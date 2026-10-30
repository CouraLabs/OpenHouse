import { z } from 'zod'

import type { Currency } from './currencies.js'
import type { LimitType } from './limits.js'
import type { TransactionType } from './transactions.js'

export const reminderDeliveries = ['individual', 'digest'] as const

export type ReminderDelivery = (typeof reminderDeliveries)[number]

export const MAX_LEAD_DAYS = 30

const leadDaysSchema = z
  .number({ error: 'Enter a number of days.' })
  .int('Enter a whole number of days.')
  .min(0, 'Enter 0 or more days.')
  .max(MAX_LEAD_DAYS, `Enter ${MAX_LEAD_DAYS} days or fewer.`)

export const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  pushDetails: z.boolean(),
  billLeadDays: leadDaysSchema,
  recurringLeadDays: leadDaysSchema,
  limitAlert80: z.boolean(),
  limitAlert100: z.boolean(),
  delivery: z.enum(reminderDeliveries, { error: 'Pick a delivery.' }),
})

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>

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

export interface BillDueDetail {
  kind: 'bill_due'
  accountName: string
  statementId: number
  amount: string
  currency: Currency
  dueDate: string
  daysLeft: number
}

export interface BillOverdueDetail {
  kind: 'bill_overdue'
  accountName: string
  statementId: number
  amount: string
  currency: Currency
  dueDate: string
}

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

export type NotificationBody =
  ReminderDetail | { kind: 'digest'; items: ReminderDetail[] }

export interface PushPayload {
  v: 1
  count: number
  url: string
  details?: NotificationBody[]
}

export interface AppNotification {
  id: number
  body: NotificationBody
  createdAt: string
  readAt: string | null
}

export interface NotificationList {
  items: AppNotification[]
  unread: number
}

export interface PushConfig {
  enabled: boolean
  publicKey: string | null
}

export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ error: 'The subscription needs an endpoint.' }).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
})

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionSchema>

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url().max(2048),
})

export type PushUnsubscribeBody = z.infer<typeof pushUnsubscribeSchema>

export interface CalendarFeed {
  path: string | null
}
