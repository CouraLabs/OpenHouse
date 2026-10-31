import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Category, CreateCategoryBody } from '@workspace/dto'
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
import { buildCategoryColumns } from './categories-columns.js'
import { CategoryForm } from './category-form.js'
import {
  useCategoriesSearch,
  useDeleteCategory,
  useSaveCategory,
} from './use-categories.js'

export function CategoriesPage() {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [filter, setFilter] = useState<FilterValues>({})

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
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(category)
        },
      }),
    [t, save.reset]
  )

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

  const toolbar = (
    <>
      <ExportCsvButton path="/categories/export" args={args} />
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
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <CategoryForm
          key={editing?.id ?? 'new'}
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
