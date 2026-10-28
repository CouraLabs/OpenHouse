import type { RecurringTransaction } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/lib/format-money.js'

/** What the actions column can do to a row, reported upward. */
export interface RecurringRowActions {
  onEdit: (rule: RecurringTransaction) => void
  onDelete: (rule: RecurringTransaction) => void
}

/**
 * The columns the recurring grid shows: the receiver, the category, the
 * account, the amount, the schedule in words, and the row actions. The
 * caller owns what edit and delete do; the columns only route the events.
 * Called during the page's render, so the labels arrive translated.
 */
export function buildRecurringColumns(
  t: (key: string, values?: Record<string, unknown>) => string,
  locale: string,
  actions: RecurringRowActions
): Array<DataTableColumn<RecurringTransaction>> {
  return [
    {
      accessorKey: 'receiverName',
      header: t('recurring.receiver'),
    },
    {
      accessorKey: 'categoryName',
      header: t('recurring.category'),
    },
    {
      accessorKey: 'accountName',
      header: t('recurring.account'),
    },
    {
      accessorKey: 'type',
      header: t('recurring.type'),
      cell: (context) => {
        const isIncome = context.row.original.type === 'Income'

        return (
          <span
            className={
              isIncome
                ? 'font-medium text-primary'
                : 'font-medium text-destructive'
            }
          >
            {t(`recurring.type-${context.row.original.type.toLowerCase()}`)}
          </span>
        )
      },
    },
    {
      accessorKey: 'amount',
      header: t('recurring.amount'),
      cell: (context) =>
        formatMoney(
          context.row.original.amount,
          locale,
          context.row.original.accountCurrency
        ),
    },
    {
      accessorKey: 'frequency',
      header: t('recurring.frequency'),
      cell: (context) => (
        <span className="text-sm text-muted-foreground">
          {readFrequency(t, context.row.original)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <RecurringActionsCell rule={context.row.original} actions={actions} />
      ),
    },
  ]
}

/**
 * Reads a rule's schedule in the user's words: `Monthly on day 5`,
 * `Weekly on Monday`, `Yearly on December 25`.
 */
export function readFrequency(
  t: (key: string, values?: Record<string, unknown>) => string,
  rule: Pick<
    RecurringTransaction,
    'frequency' | 'frequencyDay' | 'frequencyMonth'
  >
): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  switch (rule.frequency) {
    case 'Daily':
      return t('recurring.frequency-read-daily')
    case 'Weekly':
      return t('recurring.frequency-read-weekly', {
        day: t(`recurring.weekday-${rule.frequencyDay ?? 1}`),
      })
    case 'Monthly':
      return t('recurring.frequency-read-monthly', { day: rule.frequencyDay })
    case 'Yearly':
      return t('recurring.frequency-read-yearly', {
        day: rule.frequencyDay,
        month: months[(rule.frequencyMonth ?? 1) - 1],
      })
  }
}

/** The actions cell: the edit and delete buttons, one per row. */
function RecurringActionsCell({
  rule,
  actions,
}: {
  rule: RecurringTransaction
  actions: RecurringRowActions
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('recurring.edit')}
        title={t('recurring.edit')}
        onClick={() => actions.onEdit(rule)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        aria-label={t('recurring.delete')}
        title={t('recurring.delete')}
        onClick={() => actions.onDelete(rule)}
      >
        <Trash2 />
      </Button>
    </div>
  )
}
