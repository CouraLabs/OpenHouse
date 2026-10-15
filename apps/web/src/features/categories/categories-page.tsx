import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, CreateCategoryBody } from '@workspace/poco'
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
import { buildCategoryColumns } from './categories-columns.js'
import { CategoryForm } from './category-form.js'
import {
  useCategoriesSearch,
  useDeleteCategory,
  useSaveCategory,
} from './use-categories.js'

/** The page the tenant's categories are managed from: the form above the
 * table, the table below, and the delete confirmation in between. */
export function CategoriesPage() {
  const { t } = useTranslation()

  // The table's state, held here so the search args derive from it.
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  // The filter the dialog applies; the args derive from it. Applying is a
  // click, not a keystroke, so nothing needs debouncing here.
  const [filter, setFilter] = useState<FilterValues>({})

  // The form above the table, and what its buttons are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const args = useMemo(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        name: filter.name === undefined ? undefined : String(filter.name),
        status: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useCategoriesSearch(args)
  const save = useSaveCategory()
  const remove = useDeleteCategory()

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('categories.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('categories.error')
    : undefined

  // A new sort or filter is a new first page.
  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<Category>> = useMemo(
    () =>
      buildCategoryColumns(t, {
        onEdit: (category) => {
          setEditing(category)
          setFormOpen(true)
        },
        onDelete: (category) => {
          // Deleting any row cancels the edit in progress: the form would
          // otherwise keep editing a row the grid no longer holds.
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(category)
        },
      }),
    [t, save.reset]
  )

  // Saving needs no confirmation: the form's submit is the intent. A failure
  // leaves the form open, holding the values, with the error shown.
  const submitSave = (body: CreateCategoryBody) => {
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
            key: 'name',
            label: t('categories.name'),
            type: 'text',
            placeholder: t('categories.filter-placeholder'),
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
        {t('categories.new')}
      </Button>
    </>
  )

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <CategoryForm
          category={editing}
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
        emptyMessage={t('categories.empty')}
        paginationLabels={{
          rowsPerPage: t('categories.rows-per-page'),
          page: (page, count) => t('categories.page-of', { page, count }),
          previous: t('categories.previous-page'),
          next: t('categories.next-page'),
        }}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('categories.delete-title')}
        description={t('categories.delete-description', {
          name: deleting?.name ?? '',
        })}
        confirmLabel={t('categories.delete-confirm')}
        pendingLabel={t('categories.deleting')}
        cancelLabel={t('categories.cancel')}
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
