import type { Currency } from "./currencies.js"
import type { LimitType } from "./limits.js"
import type { TransactionType } from "./transactions.js"

export const reminderDeliveries = ["individual", "digest"] as const

export type ReminderDelivery = (typeof reminderDeliveries)[number]

export const MAX_LEAD_DAYS = 30

export interface NotificationPreferences {
  inAppEnabled: boolean
  pushEnabled: boolean
  pushDetails: boolean
  billLeadDays: number
  recurringLeadDays: number
  limitAlert80: boolean
  limitAlert100: boolean
  delivery: ReminderDelivery
}

export const defaultNotificationPreferences: NotificationPreferences = {
  inAppEnabled: true,
  pushEnabled: true,
  pushDetails: false,
  billLeadDays: 3,
  recurringLeadDays: 1,
  limitAlert80: true,
  limitAlert100: true,
  delivery: "individual",
}

export interface BillDueDetail {
  kind: "bill_due"
  accountName: string
  statementId: number
  amount: string
  currency: Currency
  dueDate: string
  daysLeft: number
}

export interface BillOverdueDetail {
  kind: "bill_overdue"
  accountName: string
  statementId: number
  amount: string
  currency: Currency
  dueDate: string
}

export interface RecurringDueDetail {
  kind: "recurring_due"
  name: string
  ruleId: number
  amount: string
  currency: Currency
  type: TransactionType
  date: string
  daysLeft: number
}

export interface LimitAlertDetail {
  kind: "limit_alert"
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
  | BillDueDetail
  | BillOverdueDetail
  | RecurringDueDetail
  | LimitAlertDetail

export type NotificationBody =
  | ReminderDetail
  | { kind: "digest"; items: ReminderDetail[] }

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

export type PushSubscriptionBody = {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface CalendarFeed {
  path: string | null
}
