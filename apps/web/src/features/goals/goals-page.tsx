import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreateGoalBody, Goal } from '@workspace/poco'
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
import { buildGoalColumns } from './goals-columns.js'
import { GoalForm } from './goal-form.js'
import {
  useGoalsSearch,
  useDeleteGoal,
  useSaveGoal,
  useActiveAccounts,
} from './use-goals.js'
import { formattingLocale } from '@/lib/i18n.js'

export function GoalsPage() {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const [filter, setFilter] = useState<FilterValues>({})
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

  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<Goal>> = useMemo(
    () =>
      buildGoalColumns(t, formattingLocale(), {
        onEdit: (goal) => {
          setEditing(goal)
          setFormOpen(true)
        },
        onDelete: (goal) => {
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(goal)
        },
      }),
    [t, save.reset]
  )

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

  const toolbar = (
    <>
      <ExportCsvButton path="/goals/export" args={args} />
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
    <main className="mx-auto flex w-full max-w-7xl flex-1 animate-page-in flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <GoalForm
          key={editing?.id ?? 'new'}
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
