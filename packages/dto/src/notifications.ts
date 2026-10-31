import { z } from "zod"
import {
  defaultNotificationPreferences,
  MAX_LEAD_DAYS,
  reminderDeliveries,
  type AppNotification,
  type BillDueDetail,
  type BillOverdueDetail,
  type CalendarFeed,
  type LimitAlertDetail,
  type NotificationBody,
  type NotificationList,
  type NotificationPreferences,
  type PushConfig,
  type PushPayload,
  type PushSubscriptionBody,
  type RecurringDueDetail,
  type ReminderDelivery,
  type ReminderDetail,
} from "@workspace/domain"

export {
  defaultNotificationPreferences,
  MAX_LEAD_DAYS,
  reminderDeliveries,
  type AppNotification,
  type BillDueDetail,
  type BillOverdueDetail,
  type CalendarFeed,
  type LimitAlertDetail,
  type NotificationBody,
  type NotificationList,
  type NotificationPreferences,
  type PushConfig,
  type PushPayload,
  type PushSubscriptionBody,
  type RecurringDueDetail,
  type ReminderDelivery,
  type ReminderDetail,
}

const leadDaysSchema = z
  .number({ error: "Enter a number of days." })
  .int("Enter a whole number of days.")
  .min(0, "Enter 0 or more days.")
  .max(MAX_LEAD_DAYS, `Enter ${MAX_LEAD_DAYS} days or fewer.`)

export const notificationPreferencesSchema = z.object({
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  pushDetails: z.boolean(),
  billLeadDays: leadDaysSchema,
  recurringLeadDays: leadDaysSchema,
  limitAlert80: z.boolean(),
  limitAlert100: z.boolean(),
  delivery: z.enum(reminderDeliveries, { error: "Pick a delivery." }),
})

export const pushSubscriptionSchema = z.object({
  endpoint: z.url({ error: "The subscription needs an endpoint." }).max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(512),
  }),
})

export const pushUnsubscribeSchema = z.object({
  endpoint: z.url().max(2048),
})

export type PushUnsubscribeBody = z.infer<typeof pushUnsubscribeSchema>
