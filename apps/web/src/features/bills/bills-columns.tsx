import { Link } from '@tanstack/react-router'
import type { CreditCardStatement } from '@workspace/dto'
import type { DataTableColumn } from '@workspace/ui/components/data-table'

import { formatDayLabel } from '@/lib/format-date-only.js'
import { formatMoney } from '@/lib/format-money.js'
import { StatementStatusBadge } from './statement-status-badge.js'

export function buildBillsColumns(
  t: (key: string, options?: Record<string, unknown>) => string,
  locale: string
): Array<DataTableColumn<CreditCardStatement>> {
  const money = (amount: string, bill: CreditCardStatement) =>
    formatMoney(amount, locale, bill.currency)

  return [
    {
      accessorKey: 'dueDate',
      header: t('bills.column-bill'),
      cell: (context) => {
        const bill = context.row.original

        return (
          <div className="flex flex-col">
            <Link
              to="/bills/$statementId"
              params={{ statementId: String(bill.id) }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {t('bills.bill-due', {
                due: formatDayLabel(bill.dueDate, locale),
              })}
            </Link>
            <span className="text-xs text-muted-foreground">
              {bill.accountName}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'closeDate',
      header: t('bills.column-period'),
      cell: (context) => {
        const bill = context.row.original

        return t('bills.period', {
          from: formatDayLabel(bill.periodStart, locale),
          to: formatDayLabel(bill.closesOn, locale),
        })
      },
    },
    {
      accessorKey: 'total',
      header: t('bills.column-total'),
      cell: (context) =>
        money(context.row.original.total, context.row.original),
    },
    {
      id: 'previousBalance',
      header: t('bills.column-previous'),
      enableSorting: false,
      cell: (context) =>
        money(context.row.original.previousBalance, context.row.original),
    },
    {
      id: 'paid',
      header: t('bills.column-paid'),
      enableSorting: false,
      cell: (context) => money(context.row.original.paid, context.row.original),
    },
    {
      id: 'amountDue',
      header: t('bills.column-amount-due'),
      enableSorting: false,
      cell: (context) => (
        <span className="font-medium tabular-nums">
          {money(context.row.original.amountDue, context.row.original)}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('bills.column-status'),
      enableSorting: false,
      cell: (context) => (
        <StatementStatusBadge
          status={context.row.original.status}
          amountDue={context.row.original.amountDue}
        />
      ),
    },
  ]
}
