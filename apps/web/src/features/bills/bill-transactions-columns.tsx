import type { Transaction } from '@workspace/dto'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { CalendarSync } from 'lucide-react'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

export function buildBillTransactionsColumns(
  t: (key: string) => string,
  locale: string,
  onMove: (transaction: Transaction) => void
): Array<DataTableColumn<Transaction>> {
  return [
    {
      accessorKey: 'transactionDt',
      header: t('bills.column-date'),
      cell: (context) =>
        formatDayLabel(context.row.original.transactionDt, locale),
    },
    {
      accessorKey: 'name',
      header: t('bills.column-charge'),
      cell: (context) => (
        <span className="flex items-center gap-2">
          {context.row.original.name}
          {context.row.original.statementPinned ? (
            <Badge variant="outline">{t('bills.pinned')}</Badge>
          ) : null}
        </span>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: t('bills.column-category'),
    },
    {
      accessorKey: 'amount',
      header: t('bills.column-amount'),
      cell: (context) => {
        const row = context.row.original
        const signed = row.type === 'Income' ? `-${row.amount}` : row.amount

        return (
          <span className="tabular-nums">
            {formatMoney(signed, locale, row.currency)}
          </span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: (context) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('bills.move')}
            title={t('bills.move')}
            onClick={() => onMove(context.row.original)}
          >
            <CalendarSync />
          </Button>
        </div>
      ),
    },
  ]
}
