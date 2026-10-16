import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CreateTransactionLinkerBody,
  TransactionLinker,
} from '@workspace/poco'
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
import { buildLinkerColumns } from './transaction-linkers-columns.js'
import { LinkerForm } from './linker-form.js'
import {
  useLinkersSearch,
  useDeleteLinker,
  useSaveLinker,
  useActiveCategories,
} from './use-linkers.js'

/** The page the tenant's transaction linkers are managed from: the form
 * above the table, the table below, and the delete confirmation in between. */
export function TransactionLinkersPage() {
  const { t } = useTranslation()

  // The table's state, held here so the search args derive from it.
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // The form above the table, and what its buttons are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionLinker | null>(null)
  const [deleting, setDeleting] = useState<TransactionLinker | null>(null)
  // The filter the dialog applies; the args derive from it.
  const [filter, setFilter] = useState<FilterValues>({})
  // The dropdown's choices: the tenant's categories.
  const categories = useActiveCategories()

  const args = useMemo(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        description:
          filter.description === undefined
            ? undefined
            : String(filter.description),
        categoryId:
          filter.categoryId === undefined
            ? undefined
            : Number(filter.categoryId),
        status: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useLinkersSearch(args)
  const save = useSaveLinker()
  const remove = useDeleteLinker()

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('linkers.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('linkers.error')
    : undefined

  // A new sort is a new first page.
  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<TransactionLinker>> = useMemo(
    () =>
      buildLinkerColumns(t, {
        onEdit: (linker) => {
          setEditing(linker)
          setFormOpen(true)
        },
        onDelete: (linker) => {
          // Deleting any row cancels the edit in progress: the form would
          // otherwise keep editing a row the grid no longer holds.
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(linker)
        },
      }),
    [t, save.reset]
  )

  // Saving needs no confirmation: the form's submit is the intent. A failure
  // leaves the form open, holding the values, with the error shown.
  const submitSave = (body: CreateTransactionLinkerBody) => {
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
            key: 'description',
            label: t('linkers.description'),
            type: 'text',
            placeholder: t('linkers.filter-description-placeholder'),
          },
          {
            key: 'categoryId',
            label: t('linkers.category'),
            type: 'select',
            placeholder: t('linkers.filter-category-placeholder'),
            options: (categories.data ?? []).map((category) => ({
              value: category.id,
              label: category.name,
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
        {t('linkers.new')}
      </Button>
    </>
  )

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('linkers.title')}
        subtitle={t('linkers.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <LinkerForm
          linker={editing}
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
        emptyMessage={t('linkers.empty')}
        paginationLabels={{
          rowsPerPage: t('linkers.rows-per-page'),
          page: (page, count) => t('linkers.page-of', { page, count }),
          previous: t('linkers.previous-page'),
          next: t('linkers.next-page'),
        }}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('linkers.delete-title')}
        description={t('linkers.delete-description', {
          name: deleting === null ? '' : deleting.description,
        })}
        confirmLabel={t('linkers.delete-confirm')}
        pendingLabel={t('linkers.deleting')}
        cancelLabel={t('linkers.cancel')}
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
