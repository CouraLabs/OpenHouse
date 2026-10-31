import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CreateReceiverBody, Receiver, ReceiverType } from '@workspace/dto'
import { receiverTypes } from '@workspace/dto'
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
import { buildReceiverColumns } from './receivers-columns.js'
import { ReceiverForm } from './receiver-form.js'
import {
  useReceiversSearch,
  useDeleteReceiver,
  useSaveReceiver,
} from './use-receivers.js'

export function ReceiversPage() {
  const { t } = useTranslation()

  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Receiver | null>(null)
  const [deleting, setDeleting] = useState<Receiver | null>(null)
  const [filter, setFilter] = useState<FilterValues>({})

  const args = useMemo(
    () => ({
      sort: sorting.map((clause) => ({
        field: clause.id,
        dir: clause.desc ? ('desc' as const) : ('asc' as const),
      })),
      filter: {
        name: filter.name === undefined ? undefined : String(filter.name),
        type:
          filter.type === undefined ? undefined : (filter.type as ReceiverType),
        status: 'ACTIVE' as const,
      },
      skip: pagination.pageIndex * pagination.pageSize,
      limit: pagination.pageSize,
    }),
    [sorting, pagination, filter]
  )

  const search = useReceiversSearch(args)
  const save = useSaveReceiver()
  const remove = useDeleteReceiver()

  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('receivers.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('receivers.error')
    : undefined

  const resetToFirstPage = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const columns: Array<DataTableColumn<Receiver>> = useMemo(
    () =>
      buildReceiverColumns(t, {
        onEdit: (receiver) => {
          setEditing(receiver)
          setFormOpen(true)
        },
        onDelete: (receiver) => {
          setFormOpen(false)
          setEditing(null)
          save.reset()
          setDeleting(receiver)
        },
      }),
    [t, save.reset]
  )

  const submitSave = (body: CreateReceiverBody) => {
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
      <ExportCsvButton path="/receivers/export" args={args} />
      <FilterDialog
        fields={[
          {
            key: 'name',
            label: t('receivers.name'),
            type: 'text',
            placeholder: t('receivers.filter-name-placeholder'),
          },
          {
            key: 'type',
            label: t('receivers.type'),
            type: 'select',
            placeholder: t('receivers.filter-type-placeholder'),
            options: receiverTypes.map((value) => ({
              value,
              label: t(`receivers.type-${value.toLowerCase()}`),
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
        {t('receivers.new')}
      </Button>
    </>
  )

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-1 animate-page-in flex-col gap-6 px-4 pt-4 pb-12 md:px-8 md:pt-6">
      <PageHeader
        title={t('receivers.title')}
        subtitle={t('receivers.subtitle')}
        actions={toolbar}
      />
      {formOpen ? (
        <ReceiverForm
          key={editing?.id ?? 'new'}
          receiver={editing}
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
        emptyMessage={t('receivers.empty')}
        paginationLabels={{
          rowsPerPage: t('receivers.rows-per-page'),
          page: (page, count) => t('receivers.page-of', { page, count }),
          previous: t('receivers.previous-page'),
          next: t('receivers.next-page'),
        }}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('receivers.delete-title')}
        description={t('receivers.delete-description', {
          name: deleting === null ? '' : deleting.name,
        })}
        confirmLabel={t('receivers.delete-confirm')}
        pendingLabel={t('receivers.deleting')}
        cancelLabel={t('receivers.cancel')}
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
