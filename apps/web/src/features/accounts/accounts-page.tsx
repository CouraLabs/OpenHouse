import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Account,
  AccountDeleteConflict,
  AccountType,
  CreateAccountBody,
} from '@workspace/dto'
import { accountTypes } from '@workspace/dto'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { Button } from '@workspace/ui/components/button'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'
import {
  DataTable,
  type DataTableColumn,
} from '@workspace/ui/components/data-table'
import {
  FilterDialog,
  type FilterValues,
} from '@workspace/ui/components/filter-dialog'
import { Plus } from 'lucide-react'

import { ExportCsvButton } from '@/components/export-csv-button.js'
import { PageHeader } from '@/components/page-header.js'
import { ApiError } from '@/lib/api.js'
import { formatMoney } from '@/lib/format-money.js'
import { buildAccountsColumns } from './accounts-columns.js'
import { AccountCards } from './account-cards.js'
import { AccountForm } from './account-form.js'
import { BalanceHistoryDialog } from './balance-history-dialog.js'
import { ReconcileDialog } from './reconcile-dialog.js'
import {
  useAccountsSearch,
  useDeleteAccount,
  useSaveAccount,
} from './use-accounts.js'
import { formattingLocale } from '@/lib/i18n.js'

function deleteConflictOf(error: unknown): AccountDeleteConflict | null {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'unpaidBills' in error.body
  ) {
    return error.body as AccountDeleteConflict
  }

  return null
}

export function AccountsPage() {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState<Account | null>(null)
  const [reconciling, setReconciling] = useState<Account | null>(null)
  const [viewingHistory, setViewingHistory] = useState<Account | null>(null)
  const [filter, setFilter] = useState<FilterValues>({})

  const args = useMemo(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        type:
          filter.type === undefined ? undefined : (filter.type as AccountType),
        status: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useAccountsSearch(args)
  const save = useSaveAccount()
  const remove = useDeleteAccount()

  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('accounts.error')
    : undefined
  const deleteConflict = deleteConflictOf(remove.error)
  const deleteError =
    remove.isError && deleteConflict === null
      ? remove.error instanceof Error
        ? remove.error.message
        : t('accounts.error')
      : undefined

  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<Account>> = useMemo(
    () =>
      buildAccountsColumns(t, formattingLocale(), {
        onEdit: (account) => {
          setEditing(account)
          setFormOpen(true)
        },
        onDelete: (account) => {
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(account)
        },
        onReconcile: setReconciling,
        onHistory: setViewingHistory,
      }),
    [t, save.reset]
  )

  const submitSave = (body: CreateAccountBody) => {
    save.mutate(editing === null ? body : { ...body, id: editing.id }, {
      onSuccess: () => {
        setFormOpen(false)
        setEditing(null)
      },
    })
  }

  const confirmDelete = () => {
    if (deleting === null) {
      return
    }

    remove.mutate(
      { id: deleting.id, confirmUnpaidBills: deleteConflict !== null },
      {
        onSuccess: () => {
          setDeleting(null)
          remove.reset()
        },
      }
    )
  }

  const toolbar = (
    <>
      <ExportCsvButton path="/accounts/export" args={args} />
      <FilterDialog
        fields={[
          {
            key: 'type',
            label: t('accounts.type'),
            type: 'select',
            placeholder: t('accounts.filter-type-placeholder'),
            options: accountTypes.map((value) => ({
              value,
              label: t(`accounts.type-${value.toLowerCase()}`),
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
      <Button
        onClick={() => {
          setEditing(null)
          setFormOpen(true)
        }}
      >
        <Plus />
        {t('accounts.new')}
      </Button>
    </>
  )

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('accounts.title')}
        subtitle={t('accounts.subtitle')}
        actions={toolbar}
      />
      {search.data !== undefined ? (
        <AccountCards
          accounts={search.data.items}
          onOpen={setViewingHistory}
          onCreate={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        />
      ) : null}
      {formOpen ? (
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing}
          error={saveError}
          isSaving={save.isPending}
          onSubmit={submitSave}
          onCancel={() => {
            setFormOpen(false)
            setEditing(null)
            save.reset()
          }}
        />
      ) : null}
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
        emptyMessage={t('accounts.empty')}
        paginationLabels={{
          rowsPerPage: t('accounts.rows-per-page'),
          page: (page, count) => t('accounts.page-of', { page, count }),
          previous: t('accounts.previous-page'),
          next: t('accounts.next-page'),
        }}
      />
      <ReconcileDialog
        account={reconciling}
        onClose={() => setReconciling(null)}
      />
      <BalanceHistoryDialog
        account={viewingHistory}
        onClose={() => setViewingHistory(null)}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('accounts.delete-title')}
        description={
          deleteConflict === null
            ? t('accounts.delete-description', {
                name: deleting === null ? '' : deleting.name,
              })
            : t('accounts.delete-unpaid-description', {
                name: deleting === null ? '' : deleting.name,
                count: deleteConflict.unpaidBills,
                amount: formatMoney(
                  deleteConflict.amountDue,
                  formattingLocale(),
                  deleteConflict.currency
                ),
              })
        }
        confirmLabel={t('accounts.delete-confirm')}
        pendingLabel={t('accounts.deleting')}
        cancelLabel={t('accounts.cancel')}
        isPending={remove.isPending}
        onCancel={() => {
          setDeleting(null)
          remove.reset()
        }}
        onConfirm={confirmDelete}
      />
    </main>
  )
}
