import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  Gauge,
  Repeat,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UpcomingItem } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

/** The icon each kind of line carries. */
const ICONS: Record<UpcomingItem['kind'], LucideIcon> = {
  bill: CalendarClock,
  recurring: Repeat,
  limit: Gauge,
  goal: Target,
}

/**
 * One line of the upcoming list: an icon, what is coming and when, and the
 * amount on the right. An Income rule reads as incoming, an Open bill as an
 * estimate, a bill past due as overdue.
 */
export function UpcomingItemRow({ item }: { item: UpcomingItem }) {
  const { t, i18n } = useTranslation()
  const Icon = ICONS[item.kind]
  const money = (amount: string) =>
    formatMoney(amount, i18n.language, item.currency)
  const day = (value: string) => formatDayLabel(value, i18n.language)

  const { label, amount, badge, tone } = describe(item, t, money, day)

  const text = (
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm">{label}</span>
      {badge !== undefined ? (
        <span className="text-xs text-muted-foreground">{badge}</span>
      ) : null}
    </span>
  )

  return (
    <li className="flex items-center gap-3 py-2">
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      {item.kind === 'bill' ? (
        <Link
          to="/bills/$statementId"
          params={{ statementId: String(item.statementId) }}
          className="min-w-0 flex-1 hover:underline"
        >
          {text}
        </Link>
      ) : (
        <div className="min-w-0 flex-1">{text}</div>
      )}
      {item.kind === 'bill' && item.overdue ? (
        <Badge variant="destructive">{t('upcoming.overdue')}</Badge>
      ) : null}
      <span
        className={`text-sm font-medium tabular-nums ${tone === 'in' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
      >
        {amount}
      </span>
    </li>
  )
}

interface Description {
  label: string
  amount: string
  /** The muted line under the label, when the kind has one. */
  badge?: string
  tone?: 'in'
}

function describe(
  item: UpcomingItem,
  t: (key: string, options?: Record<string, unknown>) => string,
  money: (amount: string) => string,
  day: (value: string) => string
): Description {
  switch (item.kind) {
    case 'bill':
      return {
        label: t(item.overdue ? 'upcoming.bill-overdue' : 'upcoming.bill', {
          account: item.accountName,
          date: day(item.date),
        }),
        amount: money(item.amount),
        badge: item.estimate ? t('upcoming.estimate') : undefined,
      }
    case 'recurring':
      return {
        label: t('upcoming.recurring', {
          name: item.name,
          date: day(item.date),
        }),
        amount:
          item.type === 'Income'
            ? `+${money(item.amount)}`
            : money(item.amount),
        badge: item.type === 'Income' ? t('upcoming.incoming') : undefined,
        tone: item.type === 'Income' ? 'in' : undefined,
      }
    case 'limit':
      return {
        label: t('upcoming.limit', {
          category: item.categoryName,
          percent: item.percent,
          type: t(`limits.type-${item.limitType.toLowerCase()}`).toLowerCase(),
        }),
        amount: t('upcoming.limit-amount', {
          spent: money(item.spent),
          amount: money(item.amount),
        }),
      }
    case 'goal':
      return {
        label: t('upcoming.goal', {
          name: item.name,
          amount: money(item.shortfall),
        }),
        amount: money(item.shortfall),
        badge:
          item.targetDt === null
            ? undefined
            : t('upcoming.goal-target', { date: day(item.targetDt) }),
      }
    default: {
      const exhaustive: never = item
      throw new Error(`Unhandled item: ${String(exhaustive)}`)
    }
  }
}
