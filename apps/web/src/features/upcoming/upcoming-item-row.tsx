import { Link } from '@tanstack/react-router'
import { Gauge, Target } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UpcomingItem } from '@workspace/dto'

import { IconTile } from '@workspace/ui/components/icon-tile'
import { InitialsAvatar } from '@workspace/ui/components/initials-avatar'
import { StatusPill } from '@workspace/ui/components/status-pill'
import { cn } from 'cn'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { asOutflow, formatMoney } from '@/lib/format-money.js'
import { formattingLocale } from '@/lib/i18n.js'

export function UpcomingItemRow({ item }: { item: UpcomingItem }) {
  const { t } = useTranslation()
  const locale = formattingLocale()
  const money = (amount: string, signed = false) =>
    formatMoney(amount, locale, item.currency, { signed })
  const row = describe(item, t, money, (value) => formatDayLabel(value, locale))

  const body = (
    <>
      {item.kind === 'limit' ? (
        <IconTile tone="orange" size="lg" className="rounded-xl">
          <Gauge />
        </IconTile>
      ) : item.kind === 'goal' ? (
        <IconTile tone="blue" size="lg" className="rounded-xl">
          <Target />
        </IconTile>
      ) : (
        <InitialsAvatar name={row.name} kind="organization" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[0.9375rem] font-medium">
          {row.name}
        </span>
        <span className="truncate text-[0.8125rem] text-muted-foreground">
          {row.meta}
        </span>
      </span>
      {row.pill}
      <span className="flex shrink-0 flex-col items-end text-right">
        <span
          className={cn(
            'text-[0.9375rem] font-semibold',
            row.tone === 'in' && 'text-positive'
          )}
        >
          {row.amount}
        </span>
        {row.qualifier !== undefined ? (
          <span className="text-xs text-muted-foreground">{row.qualifier}</span>
        ) : null}
      </span>
    </>
  )

  return (
    <li>
      {item.kind === 'bill' ? (
        <Link
          to="/bills/$statementId"
          params={{ statementId: String(item.statementId) }}
          className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-surface-2/70"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 py-2.5">{body}</div>
      )}
    </li>
  )
}

interface Row {
  name: string
  meta: string
  amount: string
  qualifier?: string
  pill?: React.ReactNode
  tone?: 'in'
}

function describe(
  item: UpcomingItem,
  t: (key: string, options?: Record<string, unknown>) => string,
  money: (amount: string, signed?: boolean) => string,
  day: (value: string) => string
): Row {
  switch (item.kind) {
    case 'bill':
      return {
        name: item.accountName,
        meta: t('upcoming.row-bill'),
        amount: money(asOutflow(item.amount)),
        qualifier: item.estimate
          ? t('upcoming.estimate')
          : t('upcoming.row-due'),
        pill: item.overdue ? (
          <StatusPill tone="negative" dot className="max-sm:hidden">
            {t('upcoming.overdue')}
          </StatusPill>
        ) : undefined,
      }
    case 'recurring':
      return {
        name: item.name,
        meta: t('upcoming.row-recurring', { account: item.accountName }),
        amount:
          item.type === 'Income'
            ? money(item.amount, true)
            : money(asOutflow(item.amount)),
        qualifier:
          item.type === 'Income'
            ? t('upcoming.incoming')
            : t('upcoming.row-scheduled'),
        tone: item.type === 'Income' ? 'in' : undefined,
        pill: (
          <StatusPill tone="info" dot className="max-sm:hidden">
            {t('upcoming.row-scheduled-pill')}
          </StatusPill>
        ),
      }
    case 'limit':
      return {
        name: item.categoryName,
        meta: t('upcoming.row-limit', {
          percent: item.percent,
          type: t(`limits.type-${item.limitType.toLowerCase()}`).toLowerCase(),
        }),
        amount: money(item.spent),
        qualifier: t('upcoming.row-of', { amount: money(item.amount) }),
        pill: (
          <StatusPill
            tone={item.percent >= 100 ? 'negative' : 'warning'}
            dot
            className="max-sm:hidden"
          >
            {t('upcoming.row-limit-pill', { percent: item.percent })}
          </StatusPill>
        ),
      }
    case 'goal':
      return {
        name: item.name,
        meta: t('upcoming.row-goal'),
        amount: money(item.shortfall),
        qualifier:
          item.targetDt === null
            ? t('upcoming.row-to-go')
            : t('upcoming.goal-target', { date: day(item.targetDt) }),
      }
    default: {
      const exhaustive: never = item
      throw new Error(`Unhandled item: ${String(exhaustive)}`)
    }
  }
}
