import type { Limit } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/lib/format-money.js'

/** What the actions column can do to a row, reported upward. */
export interface LimitRowActions {
  onEdit: (limit: Limit) => void
  onDelete: (limit: Limit) => void
}

/**
 * The columns the limits grid shows: the id, the type, the category's name
 * (joined on by the API — never a bare `categoryId`), the amount as money
 * in the user's locale, and the row actions. The caller owns what edit and
 * delete do; the columns only route the events. Called during the page's
 * render, so the labels arrive translated.
 */
export function buildLimitColumns(
  t: (key: string) => string,
  locale: string,
  actions: LimitRowActions
): Array<DataTableColumn<Limit>> {
  return [
    {
      id: 'id',
      header: '#',
      enableSorting: false,
      cell: (context) => context.row.original.id,
    },
    {
      accessorKey: 'type',
      header: t('limits.type'),
      cell: (context) =>
        t(`limits.type-${context.row.original.type.toLowerCase()}`),
    },
    {
      accessorKey: 'categoryName',
      header: t('limits.category'),
    },
    {
      accessorKey: 'amount',
      header: t('limits.amount'),
      cell: (context) =>
        formatMoney(
          context.row.original.amount,
          locale,
          context.row.original.currency
        ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <LimitActionsCell limit={context.row.original} actions={actions} />
      ),
    },
  ]
}

/** The actions cell: the edit and delete buttons, one per row. */
function LimitActionsCell({
  limit,
  actions,
}: {
  limit: Limit
  actions: LimitRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
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
    </div>
  )
}
