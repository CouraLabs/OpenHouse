import type { ReminderDetail } from '@workspace/poco'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

type Translate = (key: string, options?: Record<string, unknown>) => string

export function reminderText(
  detail: ReminderDetail,
  t: Translate,
  locale: string
): string {
  const money = (amount: string) => formatMoney(amount, locale, detail.currency)
  const day = (value: string) => formatDayLabel(value, locale)

  switch (detail.kind) {
    case 'bill_due':
      return t(
        detail.daysLeft === 0
          ? 'notifications.bill-due-today'
          : 'notifications.bill-due',
        {
          account: detail.accountName,
          amount: money(detail.amount),
          date: day(detail.dueDate),
        }
      )
    case 'bill_overdue':
      return t('notifications.bill-overdue', {
        account: detail.accountName,
        amount: money(detail.amount),
        date: day(detail.dueDate),
      })
    case 'recurring_due':
      return t('notifications.recurring-due', {
        name: detail.name,
        amount: money(detail.amount),
        date: day(detail.date),
      })
    case 'limit_alert':
      return t(
        detail.threshold === 100
          ? 'notifications.limit-100'
          : 'notifications.limit-80',
        {
          category: detail.categoryName,
          percent: detail.percent,
          type: t(
            `limits.type-${detail.limitType.toLowerCase()}`
          ).toLowerCase(),
          spent: money(detail.spent),
          amount: money(detail.amount),
        }
      )
    default: {
      const exhaustive: never = detail
      throw new Error(`Unhandled reminder: ${String(exhaustive)}`)
    }
  }
}
