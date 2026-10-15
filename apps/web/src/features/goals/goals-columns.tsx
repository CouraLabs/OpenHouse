import type { Goal } from '@workspace/poco'
import { GaugeBar } from '@workspace/ui/components/gauge-bar'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { parseDateOnly } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

/** What the actions column can do to a row, reported upward. */
export interface GoalRowActions {
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
}

/** The columns the goals grid shows: the id, the name, the linked account's
 * name (joined on by the API — never a bare `linkedAccountId`), the gauge
 * from the balance toward the target, the deadline, and the row actions.
 * The caller owns what edit and delete do; the columns only route the
 * events. Called during the page's render, so the labels arrive translated. */
export function buildGoalColumns(
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string,
  actions: GoalRowActions
): Array<DataTableColumn<Goal>> {
  return [
    {
      id: 'id',
      header: '#',
      enableSorting: false,
      cell: (context) => context.row.original.id,
    },
    {
      accessorKey: 'name',
      header: t('goals.name'),
    },
    {
      accessorKey: 'accountName',
      header: t('goals.account'),
    },
    {
      id: 'progress',
      header: t('goals.progress'),
      enableSorting: false,
      cell: (context) => {
        const goal = context.row.original

        return (
          <GaugeBar
            value={Number(goal.balance)}
            max={Number(goal.targetBalance)}
            format={(amount) =>
              formatMoney(String(amount), locale, goal.currency)
            }
            // The greener the fuller: the fill starts with no color near 0
            // and reaches full green at the target.
            colorFor={(pct) => `rgba(34, 197, 94, ${(pct / 100).toFixed(2)})`}
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

/** The actions cell: the edit and delete buttons, one per row. */
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
