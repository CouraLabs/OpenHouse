import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SearchTransactionsArgs, Transaction } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { DataTable } from '@workspace/ui/components/data-table'
import { ArrowLeft, Scale, WalletCards } from 'lucide-react'

import { PageHeader } from '@/components/page-header.js'
import { formatDayLabel } from '@/lib/format-date-only.js'
import { useStatement } from '@/lib/statements.js'
import { BillPaymentsTable } from './bill-payments-table.js'
import { buildBillTransactionsColumns } from './bill-transactions-columns.js'
import { MoveStatementDialog } from './move-statement-dialog.js'
import { PayBillDialog } from './pay-bill-dialog.js'
import { ReconcileDialog } from './reconcile-dialog.js'
import { StatementStatusBadge } from './statement-status-badge.js'
import { StatementSummary } from './statement-summary.js'
import { useBillTransactions } from './use-bills.js'
import { formattingLocale } from '@/lib/i18n.js'

export function BillDetailPage() {
  const { t } = useTranslation()
  const { statementId } = useParams({ from: '/_main/bills/$statementId' })
  const id = Number(statementId)
  const bill = useStatement(id)
  const { pay } = useSearch({ from: '/_main/bills/$statementId' })
  const navigate = useNavigate({ from: '/bills/$statementId' })
  const setPaying = (open: boolean) =>
    void navigate({ search: open ? { pay: true } : {}, replace: true })
  const [reconciling, setReconciling] = useState(false)

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'transactionDt', desc: false },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  })
  const [moving, setMoving] = useState<Transaction | null>(null)

  const args = useMemo<SearchTransactionsArgs>(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        statementId: id,
        creditMode: 'accrual' as const,
        lifecycle: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [id, sorting, pagination]
  )
  const charges = useBillTransactions(args)
  const columns = useMemo(
    () => buildBillTransactionsColumns(t, formattingLocale(), setMoving),
    [t]
  )

  const back = (
    <Button
      variant="outline"
      nativeButton={false}
      render={<Link to="/bills" />}
    >
      <ArrowLeft />
      {t('bills.back')}
    </Button>
  )

  if (bill.data === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
        <PageHeader
          title={t('bills.title')}
          subtitle={bill.isError ? t('bills.not-found') : t('bills.loading')}
          actions={back}
        />
      </main>
    )
  }

  const statement = bill.data

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('bills.detail-title', {
          card: statement.accountName,
          due: formatDayLabel(statement.dueDate, formattingLocale(), {
            dateStyle: 'medium',
          }),
        })}
        subtitle={t('bills.period', {
          from: formatDayLabel(statement.periodStart, formattingLocale()),
          to: formatDayLabel(statement.closesOn, formattingLocale()),
        })}
        actions={
          <>
            <StatementStatusBadge
              status={statement.status}
              amountDue={statement.amountDue}
            />
            {statement.status === 'Paid' ? null : (
              <Button onClick={() => setPaying(true)}>
                <WalletCards />
                {t('bills.pay')}
              </Button>
            )}
            <Button variant="outline" onClick={() => setReconciling(true)}>
              <Scale />
              {t('bills.reconcile')}
            </Button>
            {back}
          </>
        }
      />
      <StatementSummary bill={statement} locale={formattingLocale()} />
      <DataTable
        columns={columns}
        data={charges.data?.items ?? []}
        total={charges.data?.total ?? 0}
        isLoading={charges.isPending || charges.isPlaceholderData}
        sorting={sorting}
        onSortingChange={setSorting}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage={t('bills.no-charges')}
        paginationLabels={{
          rowsPerPage: t('bills.rows-per-page'),
          page: (page, count) => t('bills.page-of', { page, count }),
          previous: t('bills.previous-page'),
          next: t('bills.next-page'),
        }}
      />
      <BillPaymentsTable statementId={id} onMove={setMoving} />
      <MoveStatementDialog
        transaction={moving}
        onClose={() => setMoving(null)}
      />
      <PayBillDialog
        bill={statement}
        open={pay === true}
        onClose={() => setPaying(false)}
      />
      <ReconcileDialog
        bill={statement}
        open={reconciling}
        onClose={() => setReconciling(false)}
      />
    </main>
  )
}
