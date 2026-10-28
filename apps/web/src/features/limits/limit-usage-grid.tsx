import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { LimitUsage } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { GaugeBar } from '@workspace/ui/components/gauge-bar'
import { Pencil, Trash2 } from 'lucide-react'

import { formatMoney } from '@/lib/format-money.js'

/** What a usage card's actions can do, reported upward. */
export interface LimitUsageActions {
  onEdit: (limit: LimitUsage) => void
  onDelete: (limit: LimitUsage) => void
}

/**
 * One limit's usage as a card: the category, the period it covers, and the
 * gauge of what the period has spent against the cap — the API having done
 * the totaling. The fill runs the semantic green while there is room and
 * takes the destructive token once the spending passes the cap; the figure
 * beside the bar carries the exact numbers, so color never works alone.
 */
export function LimitUsageCard({
  limit,
  locale,
  actions,
}: {
  limit: LimitUsage
  locale: string
  actions: LimitUsageActions
}) {
  const { t } = useTranslation()

  const spent = Number(limit.spent)
  const cap = Number(limit.amount)
  const over = spent > cap

  return (
    <Card size="sm" className={over ? 'ring-destructive/30' : undefined}>
      <CardHeader>
        <CardTitle className="truncate">{limit.categoryName}</CardTitle>
        <CardDescription>
          {t(`limits.type-${limit.type.toLowerCase()}`)}
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('limits.edit')}
            title={t('limits.edit')}
            onClick={() => actions.onEdit(limit)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            aria-label={t('limits.delete')}
            title={t('limits.delete')}
            onClick={() => actions.onDelete(limit)}
          >
            <Trash2 />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <GaugeBar
          value={spent}
          max={cap}
          format={(amount) => formatMoney(String(amount), locale, limit.currency)}
          colorFor={over ? () => 'var(--destructive)' : undefined}
          aria-label={t('transactions.dashboard-limit-aria', {
            name: limit.categoryName,
          })}
          className="min-w-0"
        />
        {limit.excludedCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            {t('transactions.dashboard-limit-excluded', {
              count: limit.excludedCount,
            })}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * The usage card grid: one card per ACTIVE limit, the ones closest to —
 * or past — their cap first, so what needs attention leads. Collapses to a
 * single column on mobile.
 */
export function LimitUsageGrid({
  usage,
  locale,
  actions,
}: {
  usage: LimitUsage[]
  locale: string
  actions: LimitUsageActions
}) {
  const sorted = useMemo(
    () =>
      [...usage].sort((a, b) => {
        const ratioA = Number(a.amount) > 0 ? Number(a.spent) / Number(a.amount) : 0
        const ratioB = Number(b.amount) > 0 ? Number(b.spent) / Number(b.amount) : 0
        return ratioB - ratioA
      }),
    [usage]
  )

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sorted.map((limit) => (
        <LimitUsageCard
          key={limit.id}
          limit={limit}
          locale={locale}
          actions={actions}
        />
      ))}
    </div>
  )
}
