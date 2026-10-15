import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CreateRecurringTransactionBody,
  Frequency,
  RecurringTransaction,
} from '@workspace/poco'
import { frequencies } from '@workspace/poco'
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

import { PageHeader } from '@/components/page-header.js'
import { buildRecurringColumns } from './recurring-transactions-columns.js'
import { RecurringForm } from './recurring-form.js'
import {
  useRecurringSearch,
  useDeleteRecurring,
  useSaveRecurring,
  useActiveCategories,
  useActiveReceivers,
  useActiveAccounts,
} from './use-recurring.js'

/** The page the tenant's recurring rules are managed from: the form above
 * the table, the table below, and the delete confirmation in between. */
export function RecurringTransactionsPage() {
  const { t, i18n } = useTranslation()

  // The table's state, held here so the search args derive from it.
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // The form above the table, and what its buttons are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | null>(null)
  const [deleting, setDeleting] = useState<RecurringTransaction | null>(null)
  // The filter the dialog applies; the args derive from it.
  const [filter, setFilter] = useState<FilterValues>({})
  // The dropdowns' choices.
  const categories = useActiveCategories()
  const receivers = useActiveReceivers()
  const accounts = useActiveAccounts()

  const args = useMemo(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        categoryId:
          filter.categoryId === undefined
            ? undefined
            : Number(filter.categoryId),
        receiverId:
          filter.receiverId === undefined
            ? undefined
            : Number(filter.receiverId),
        linkedAccountId:
          filter.linkedAccountId === undefined
            ? undefined
            : Number(filter.linkedAccountId),
        frequency:
          filter.frequency === undefined
            ? undefined
            : (filter.frequency as Frequency),
        status: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useRecurringSearch(args)
  const save = useSaveRecurring()
  const remove = useDeleteRecurring()

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('recurring.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('recurring.error')
    : undefined

  // A new sort is a new first page.
  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<RecurringTransaction>> = useMemo(
    () =>
      buildRecurringColumns(t, i18n.language, {
        onEdit: (rule) => {
          setEditing(rule)
          setFormOpen(true)
        },
        onDelete: (rule) => {
          // Deleting any row cancels the edit in progress: the form would
          // otherwise keep editing a row the grid no longer holds.
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(rule)
        },
      }),
    [t, i18n.language, save.reset]
  )

  // Saving needs no confirmation: the form's submit is the intent. A failure
  // leaves the form open, holding the values, with the error shown.
  const submitSave = (body: CreateRecurringTransactionBody) => {
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

    remove.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    })
  }

  // The page's actions, on the header line: the filter and the insert.
  const toolbar = (
    <>
      <FilterDialog
        fields={[
          {
            key: 'receiverId',
            label: t('recurring.receiver'),
            type: 'select',
            placeholder: t('recurring.filter-receiver-placeholder'),
            options: (receivers.data ?? []).map((receiver) => ({
              value: receiver.id,
              label: receiver.name,
            })),
          },
          {
            key: 'categoryId',
            label: t('recurring.category'),
            type: 'select',
            placeholder: t('recurring.filter-category-placeholder'),
            options: (categories.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
            })),
          },
          {
            key: 'linkedAccountId',
            label: t('recurring.account'),
            type: 'select',
            placeholder: t('recurring.filter-account-placeholder'),
            options: (accounts.data ?? []).map((account) => ({
              value: account.id,
              label: account.name,
            })),
          },
          {
            key: 'frequency',
            label: t('recurring.frequency'),
            type: 'select',
            placeholder: t('recurring.filter-frequency-placeholder'),
            options: frequencies.map((value) => ({
              value,
              label: t(`recurring.frequency-${value.toLowerCase()}`),
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
        {t('recurring.new')}
      </Button>
    </>
  )

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('recurring.title')}
        subtitle={t('recurring.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <RecurringForm
          rule={editing}
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
        emptyMessage={t('recurring.empty')}
        paginationLabels={{
          rowsPerPage: t('recurring.rows-per-page'),
          page: (page, count) => t('recurring.page-of', { page, count }),
          previous: t('recurring.previous-page'),
          next: t('recurring.next-page'),
        }}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('recurring.delete-title')}
        description={t('recurring.delete-description', {
          name: deleting === null ? '' : deleting.receiverName,
        })}
        confirmLabel={t('recurring.delete-confirm')}
        pendingLabel={t('recurring.deleting')}
        cancelLabel={t('recurring.cancel')}
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
