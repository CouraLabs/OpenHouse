import type { PaginationState, SortingState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchTransactionsArgs, Transaction } from '@workspace/dto'
import { DataTable } from '@workspace/ui/components/data-table'

import { buildBillPaymentsColumns } from './bill-payments-columns.js'
import { useBillTransactions } from './use-bills.js'
import { formattingLocale } from '@/lib/i18n.js'

export function BillPaymentsTable({
  statementId,
  onMove,
}: {
  statementId: number
  onMove: (payment: Transaction) => void
}) {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'transactionDt', desc: false },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const args = useMemo<SearchTransactionsArgs>(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        paymentStatementId: statementId,
        creditMode: 'accrual' as const,
        lifecycle: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [statementId, sorting, pagination]
  )
  const payments = useBillTransactions(args)
  const columns = useMemo(
    () => buildBillPaymentsColumns(t, formattingLocale(), onMove),
    [t, onMove]
  )

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-medium">{t('bills.payments')}</h2>
      <DataTable
        columns={columns}
        data={payments.data?.items ?? []}
        total={payments.data?.total ?? 0}
        isLoading={payments.isPending || payments.isPlaceholderData}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage={t('bills.no-payments')}
        paginationLabels={{
          rowsPerPage: t('bills.rows-per-page'),
          page: (page, count) => t('bills.page-of', { page, count }),
          previous: t('bills.previous-page'),
          next: t('bills.next-page'),
        }}
      />
    </section>
  )
}
