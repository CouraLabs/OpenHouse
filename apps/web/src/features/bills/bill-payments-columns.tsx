import type { Transaction } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import type { DataTableColumn } from '@workspace/ui/components/data-table'
import { CalendarSync } from 'lucide-react'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'

export function buildBillPaymentsColumns(
  t: (key: string) => string,
  locale: string,
  onMove: (payment: Transaction) => void
): Array<DataTableColumn<Transaction>> {
  return [
    {
      accessorKey: 'transactionDt',
      header: t('bills.column-date'),
      cell: (context) =>
        formatDayLabel(context.row.original.transactionDt, locale),
    },
    {
      accessorKey: 'categoryName',
      header: t('bills.column-category'),
    },
    {
      accessorKey: 'amount',
      header: t('bills.column-amount'),
      cell: (context) => (
        <span className="tabular-nums">
          {formatMoney(
            context.row.original.amount,
            locale,
            context.row.original.currency
          )}
        </span>
      ),
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
            aria-label={t('bills.move-payment')}
            title={t('bills.move-payment')}
            onClick={() => onMove(context.row.original)}
          >
            <CalendarSync />
          </Button>
        </div>
      ),
    },
  ]
}
