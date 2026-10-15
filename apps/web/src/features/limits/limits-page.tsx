import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CreateLimitBody,
  Currency,
  Limit,
  LimitType,
} from '@workspace/poco'
import { currencies, limitTypes } from '@workspace/poco'
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
import { buildLimitColumns } from './limits-columns.js'
import { LimitForm } from './limit-form.js'
import {
  useLimitsSearch,
  useDeleteLimit,
  useSaveLimit,
  useActiveCategories,
} from './use-limits.js'

/** The page the tenant's limits are managed from: the form above the
 * table, the table below, and the delete confirmation in between. */
export function LimitsPage() {
  const { t, i18n } = useTranslation()

  // The table's state, held here so the search args derive from it.
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // The form above the table, and what its buttons are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Limit | null>(null)
  const [deleting, setDeleting] = useState<Limit | null>(null)
  // The filter the dialog applies; the args derive from it.
  const [filter, setFilter] = useState<FilterValues>({})
  // The dropdown's choices: the type period, and the tenant's categories.
  const categories = useActiveCategories()

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
        type:
          filter.type === undefined ? undefined : (filter.type as LimitType),
        currency:
          filter.currency === undefined
            ? undefined
            : (filter.currency as Currency),
        status: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useLimitsSearch(args)
  const save = useSaveLimit()
  const remove = useDeleteLimit()

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('limits.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('limits.error')
    : undefined

  // A new sort is a new first page.
  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<Limit>> = useMemo(
    () =>
      buildLimitColumns(t, i18n.language, {
        onEdit: (limit) => {
          setEditing(limit)
          setFormOpen(true)
        },
        onDelete: (limit) => {
          // Deleting any row cancels the edit in progress: the form would
          // otherwise keep editing a row the grid no longer holds.
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(limit)
        },
      }),
    [t, i18n.language, save.reset]
  )

  // Saving needs no confirmation: the form's submit is the intent. A failure
  // leaves the form open, holding the values, with the error shown.
  const submitSave = (body: CreateLimitBody) => {
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
            key: 'type',
            label: t('limits.type'),
            type: 'select',
            placeholder: t('limits.filter-type-placeholder'),
            options: limitTypes.map((value) => ({
              value,
              label: t(`limits.type-${value.toLowerCase()}`),
            })),
          },
          {
            key: 'currency',
            label: t('limits.currency'),
            type: 'select',
            placeholder: t('limits.filter-currency-placeholder'),
            options: currencies.map((value) => ({
              value,
              label: value,
            })),
          },
          {
            key: 'categoryId',
            label: t('limits.category'),
            type: 'select',
            placeholder: t('limits.filter-category-placeholder'),
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
        {t('limits.new')}
      </Button>
    </>
  )

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('limits.title')}
        subtitle={t('limits.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <LimitForm
          limit={editing}
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
        emptyMessage={t('limits.empty')}
        paginationLabels={{
          rowsPerPage: t('limits.rows-per-page'),
          page: (page, count) => t('limits.page-of', { page, count }),
          previous: t('limits.previous-page'),
          next: t('limits.next-page'),
        }}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('limits.delete-title')}
        description={t('limits.delete-description', {
          name:
            deleting === null
              ? ''
              : t(`limits.type-${deleting.type.toLowerCase()}`),
        })}
        confirmLabel={t('limits.delete-confirm')}
        pendingLabel={t('limits.deleting')}
        cancelLabel={t('limits.cancel')}
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
