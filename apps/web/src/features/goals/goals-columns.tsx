import type { Goal } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { GaugeBar } from '@workspace/ui/components/gauge-bar'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { parseDateOnly } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { goalGaugeColor } from '@/lib/goal-gauge-color.js'

export interface GoalRowActions {
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
}

export function buildGoalColumns(
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
  actions: GoalRowActions
): Array<DataTableColumn<Goal>> {
  return [
    {
      accessorKey: 'name',
      header: t('goals.name'),
    },
    {
      accessorKey: 'accountName',
      header: t('goals.account'),
      cell: (context) => {
        const goal = context.row.original

        return (
          <span className="flex items-center gap-2">
            <span className="truncate">{goal.accountName}</span>
            {goal.accountCurrency !== goal.currency ? (
              <Badge
                variant="outline"
                title={t('goals.currency-mismatch-hint', {
                  account: goal.accountCurrency,
                  currency: goal.currency,
                })}
              >
                {t('goals.currency-mismatch')}
              </Badge>
            ) : null}
          </span>
        )
      },
    },
    {
      id: 'progress',
      header: t('goals.progress'),
      enableSorting: false,
      cell: (context) => {
        const goal = context.row.original

        return (
          <GaugeBar
            value={Number(
              goal.accountCurrency === goal.currency
                ? goal.accountBalance
                : goal.balance
            )}
            max={Number(goal.targetBalance)}
            format={(amount) =>
              formatMoney(String(amount), locale, goal.currency)
            }
            colorFor={goalGaugeColor}
            aria-label={t('goals.progress-aria', { name: goal.name })}
          />
        )
      },
    },
    {
      accessorKey: 'targetDt',
      header: t('goals.target-date'),
      cell: (context) =>
        context.row.original.targetDt === null
          ? '—'
          : new Intl.DateTimeFormat(locale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }).format(parseDateOnly(context.row.original.targetDt)),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <GoalActionsCell goal={context.row.original} actions={actions} />
      ),
    },
  ]
}

function GoalActionsCell({
  goal,
  actions,
}: {
  goal: Goal
  actions: GoalRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('goals.edit')}
        title={t('goals.edit')}
        onClick={() => actions.onEdit(goal)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={t('goals.delete')}
        title={t('goals.delete')}
        onClick={() => actions.onDelete(goal)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
