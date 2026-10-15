import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreateGoalBody, Currency, Goal } from '@workspace/poco'
import { currencies } from '@workspace/poco'
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
import { buildGoalColumns } from './goals-columns.js'
import { GoalForm } from './goal-form.js'
import {
  useGoalsSearch,
  useDeleteGoal,
  useSaveGoal,
  useActiveAccounts,
} from './use-goals.js'

/** The page the tenant's goals are managed from: the form above the
 * table, the table below, and the delete confirmation in between. */
export function GoalsPage() {
  const { t, i18n } = useTranslation()

  // The table's state, held here so the search args derive from it.
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  // The form above the table, and what its buttons are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  // The filter the dialog applies; the args derive from it.
  const [filter, setFilter] = useState<FilterValues>({})
  // The filter's account choices: the tenant's ACTIVE accounts, by name.
  const accounts = useActiveAccounts()

  const args = useMemo(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        linkedAccountId:
          filter.linkedAccountId === undefined
            ? undefined
            : Number(filter.linkedAccountId),
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

  const search = useGoalsSearch(args)
  const save = useSaveGoal()
  const remove = useDeleteGoal()

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('goals.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('goals.error')
    : undefined

  // A new sort is a new first page.
  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<Goal>> = useMemo(
    () =>
      buildGoalColumns(t, i18n.language, {
        onEdit: (goal) => {
          setEditing(goal)
          setFormOpen(true)
        },
        onDelete: (goal) => {
          // Deleting any row cancels the edit in progress: the form would
          // otherwise keep editing a row the grid no longer holds.
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(goal)
        },
      }),
    [t, i18n.language, save.reset]
  )

  // Saving needs no confirmation: the form's submit is the intent. A failure
  // leaves the form open, holding the values, with the error shown.
  const submitSave = (body: CreateGoalBody) => {
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
            key: 'linkedAccountId',
            label: t('goals.account'),
            type: 'select',
            placeholder: t('goals.filter-account-placeholder'),
            options: (accounts.data ?? []).map((account) => ({
              value: account.id,
              label: account.name,
            })),
          },
          {
            key: 'currency',
            label: t('goals.currency'),
            type: 'select',
            placeholder: t('goals.filter-currency-placeholder'),
            options: currencies.map((value) => ({
              value,
              label: value,
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
        {t('goals.new')}
      </Button>
    </>
  )

  return (
    <main className="flex flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <GoalForm
          goal={editing}
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
        emptyMessage={t('goals.empty')}
        paginationLabels={{
          rowsPerPage: t('goals.rows-per-page'),
          page: (page, count) => t('goals.page-of', { page, count }),
          previous: t('goals.previous-page'),
          next: t('goals.next-page'),
        }}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('goals.delete-title')}
        description={t('goals.delete-description', {
          name: deleting === null ? '' : deleting.name,
        })}
        confirmLabel={t('goals.delete-confirm')}
        pendingLabel={t('goals.deleting')}
        cancelLabel={t('goals.cancel')}
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
