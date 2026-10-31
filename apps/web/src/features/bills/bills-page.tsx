import { useSearch } from '@tanstack/react-router'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  statementStatuses,
  type SearchStatementsArgs,
  type StatementStatus,
} from '@workspace/dto'
import { DataTable } from '@workspace/ui/components/data-table'
import {
  FilterDialog,
  type FilterValues,
} from '@workspace/ui/components/filter-dialog'

import { PageHeader } from '@/components/page-header.js'
import { useStatementSearch } from '@/lib/statements.js'
import { buildBillsColumns } from './bills-columns.js'
import { useActiveAccounts } from './use-bills.js'
import { formattingLocale } from '@/lib/i18n.js'

export function BillsPage() {
  const { t } = useTranslation()
  const { accountId } = useSearch({ from: '/_main/bills' })

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'dueDate', desc: true },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [filter, setFilter] = useState<FilterValues>(() =>
    accountId === undefined ? {} : { accountId }
  )

  const accounts = useActiveAccounts()
  const cards = (accounts.data ?? []).filter(
    (account) => account.type === 'Credit Card'
  )

  const args = useMemo<SearchStatementsArgs>(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        accountId:
          filter.accountId === undefined ? undefined : Number(filter.accountId),
        status:
          filter.status === undefined
            ? undefined
            : [filter.status as StatementStatus],
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useStatementSearch(args)
  const columns = useMemo(() => buildBillsColumns(t, formattingLocale()), [t])

  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('bills.title')}
        subtitle={t('bills.subtitle')}
        actions={
          <FilterDialog
            fields={[
              {
                key: 'accountId',
                label: t('bills.card'),
                type: 'select',
                placeholder: t('bills.card-placeholder'),
                options: cards.map((card) => ({
                  value: card.id,
                  label: card.name,
                })),
              },
              {
                key: 'status',
                label: t('bills.column-status'),
                type: 'select',
                placeholder: t('bills.status-placeholder'),
                options: statementStatuses.map((status) => ({
                  value: status,
                  label: t(`bills.status-${status.toLowerCase()}`),
                })),
              },
            ]}
            values={filter}
            onApply={(values) => {
              setFilter(values)
              resetToFirstPage()
            }}
            labels={{
              trigger: t('filter.trigger'),
              title: t('filter.title'),
              apply: t('filter.apply'),
              clear: t('filter.clear'),
              cancel: t('filter.cancel'),
            }}
          />
        }
      />
      <DataTable
        columns={columns}
        data={search.data?.items ?? []}
        total={search.data?.total ?? 0}
        isLoading={search.isPending || search.isPlaceholderData}
        sorting={sorting}
        onSortingChange={(nextSorting) => {
          setSorting(nextSorting)
          resetToFirstPage()
        }}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyMessage={t('bills.empty')}
        paginationLabels={{
          rowsPerPage: t('bills.rows-per-page'),
          page: (page, count) => t('bills.page-of', { page, count }),
          previous: t('bills.previous-page'),
          next: t('bills.next-page'),
        }}
      />
    </main>
  )
}
