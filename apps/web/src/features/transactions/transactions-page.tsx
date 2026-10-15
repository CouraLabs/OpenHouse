import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CreateTransactionBody,
  SearchTransactionsArgs,
  Transaction,
  TransactionStatus,
  TransactionType,
  TransferBody,
} from '@workspace/poco'
import { ArrowLeftRight, Plus } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'
import {
  FilterDialog,
  type FilterValues,
} from '@workspace/ui/components/filter-dialog'
import { PageHeader } from '@/components/page-header.js'
import { formatDateOnly } from '@/lib/format-date-only.js'
import { FilterChips } from './filter-chips.js'
import { MonthFilter } from './month-filter.js'
import { SummaryCards } from './summary-cards.js'
import { TransactionForm } from './transaction-form.js'
import { TransactionGrid } from './transaction-grid.js'
import { TransferForm } from './transfer-form.js'
import {
  useActiveAccounts,
  useActiveCategories,
  useActiveReceivers,
  useDeleteTransaction,
  useSaveTransaction,
  useTransactionsInfinite,
  useTransfer,
  useTransactionSummary,
} from './use-transactions.js'

/** The month window an anchor date describes, as inclusive `YYYY-MM-DD`
 * ends — the date range every search, summary, and chip reads. */
function monthRange(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)

  return { from: formatDateOnly(from), to: formatDateOnly(to) }
}

/** Moves an anchor date one month, keeping the day of the month clamped. */
function shiftMonth(anchor: Date, months: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + months, 1)
}

/**
 * The page the tenant's transactions are managed from: the month
 * navigator, the summary cards, the applied-filter chips, and the
 * virtualized day-grouped grid, with the form in a sheet and the transfer
 * in a dialog.
 */
export function TransactionsPage() {
  const { t, i18n } = useTranslation()

  // The month the grid shows, defaulting to the current one. Every other
  // piece of state derives its date range from this anchor.
  const [anchor, setAnchor] = useState(() => {
    const now = new Date()

    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const range = monthRange(anchor)

  // The dialog's filters; the args derive from them.
  const [filter, setFilter] = useState<FilterValues>({})

  // The form's sheet, the transfer's dialog, and what they are about to do.
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  // The rows the selection checkbox column holds.
  const [selection, setSelection] = useState<Set<number>>(new Set())

  const accounts = useActiveAccounts()
  const categories = useActiveCategories()
  const receivers = useActiveReceivers()

  const args = useMemo<SearchTransactionsArgs>(
    () => ({
      sort: [
        { field: 'transactionDt', dir: 'desc' },
        { field: 'id', dir: 'desc' },
      ],
      filter: {
        transactionDtFrom: range.from,
        transactionDtTo: range.to,
        categoryId:
          filter.categoryId === undefined
            ? undefined
            : Number(filter.categoryId),
        linkedAccountId:
          filter.linkedAccountId === undefined
            ? undefined
            : Number(filter.linkedAccountId),
        receiverId:
          filter.receiverId === undefined
            ? undefined
            : Number(filter.receiverId),
        type:
          filter.type === undefined
            ? undefined
            : (filter.type as TransactionType),
        status:
          filter.status === undefined
            ? undefined
            : (filter.status as TransactionStatus),
        lifecycle: 'ACTIVE' as const,
      },
      skip: 0,
      limit: 50,
    }),
    [range.from, range.to, filter]
  )

  const search = useTransactionsInfinite(args)
  const summary = useTransactionSummary(args.filter)
  const save = useSaveTransaction()
  const remove = useDeleteTransaction()
  const transfer = useTransfer()

  // The loaded rows, flattened newest first — what the grid groups by day.
  const rows = useMemo(
    () => (search.data?.pages ?? []).flatMap((page) => page.items),
    [search.data]
  )
  const hasMore = search.hasNextPage

  // The errors the mutations answer with, read from the state the query
  // client already holds — no mirror of it in local state.
  const saveError = save.isError
    ? save.error instanceof Error
      ? save.error.message
      : t('transactions.error')
    : undefined
  const deleteError = remove.isError
    ? remove.error instanceof Error
      ? remove.error.message
      : t('transactions.error')
    : undefined
  const transferError = transfer.isError
    ? transfer.error instanceof Error
      ? transfer.error.message
      : t('transactions.error')
    : undefined

  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(anchor)

  // The applied filters, as removable chips: the month, then every dialog
  // filter the user set. Clearing one resets nothing else.
  const chips = useMemo(() => {
    const list = [
      {
        label: t('transactions.chip-month', { month: monthLabel }),
        onClear: () =>
          setAnchor(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          ),
      },
    ]

    if (filter.categoryId !== undefined) {
      const category = (categories.data ?? []).find(
        (candidate) => candidate.id === Number(filter.categoryId)
      )

      list.push({
        label: `${t('transactions.category')}: ${category?.name ?? filter.categoryId}`,
        onClear: () =>
          setFilter((current) => ({ ...current, categoryId: undefined })),
      })
    }

    if (filter.linkedAccountId !== undefined) {
      const account = (accounts.data ?? []).find(
        (candidate) => candidate.id === Number(filter.linkedAccountId)
      )

      list.push({
        label: `${t('transactions.account')}: ${account?.name ?? filter.linkedAccountId}`,
        onClear: () =>
          setFilter((current) => ({ ...current, linkedAccountId: undefined })),
      })
    }

    if (filter.receiverId !== undefined) {
      const receiver = (receivers.data ?? []).find(
        (candidate) => candidate.id === Number(filter.receiverId)
      )

      list.push({
        label: `${t('transactions.receiver')}: ${receiver?.name ?? filter.receiverId}`,
        onClear: () =>
          setFilter((current) => ({ ...current, receiverId: undefined })),
      })
    }

    if (filter.type !== undefined) {
      list.push({
        label: `${t('transactions.type')}: ${t(
          `transactions.type-${String(filter.type).toLowerCase()}`
        )}`,
        onClear: () =>
          setFilter((current) => ({ ...current, type: undefined })),
      })
    }

    if (filter.status !== undefined) {
      list.push({
        label: `${t('transactions.status')}: ${t(
          `transactions.status-${String(filter.status).toLowerCase()}`
        )}`,
        onClear: () =>
          setFilter((current) => ({ ...current, status: undefined })),
      })
    }

    return list
  }, [t, monthLabel, filter, categories.data, accounts.data, receivers.data])

  // Saving needs no confirmation: the sheet's submit is the intent. A
  // failure leaves the sheet open, holding the values, with the error shown.
  const submitSave = (body: CreateTransactionBody) => {
    save.mutate(editing === null ? body : { ...body, id: editing.id }, {
      onSuccess: () => {
        setFormOpen(false)
        setEditing(null)
        setSelection(new Set())
      },
    })
  }

  const submitTransfer = (body: TransferBody) => {
    transfer.mutate(body, {
      onSuccess: () => {
        setTransferOpen(false)
        transfer.reset()
      },
    })
  }

  const confirmDelete = () => {
    if (deleting === null) {
      return
    }

    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null)
        // A destructive row action clears the page's form state too: the
        // sheet would otherwise keep editing a row the grid no longer holds.
        setFormOpen(false)
        setEditing(null)
        save.reset()
      },
    })
  }

  const toggleRow = (transaction: Transaction) => {
    setSelection((current) => {
      const next = new Set(current)

      if (next.has(transaction.id)) {
        next.delete(transaction.id)
      } else {
        next.add(transaction.id)
      }

      return next
    })
  }

  const toggleAll = () => {
    setSelection((current) =>
      current.size === rows.length && rows.length > 0
        ? new Set()
        : new Set(rows.map((row) => row.id))
    )
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 p-6">
      <PageHeader
        title={t('transactions.title')}
        subtitle={t('transactions.subtitle')}
        actions={
          <>
            <MonthFilter
              label={monthLabel}
              onPrevious={() => setAnchor((current) => shiftMonth(current, -1))}
              onNext={() => setAnchor((current) => shiftMonth(current, 1))}
            />
            <FilterDialog
              fields={[
                {
                  key: 'categoryId',
                  label: t('transactions.category'),
                  type: 'select',
                  placeholder: t('transactions.filter-category-placeholder'),
                  options: (categories.data ?? []).map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                },
                {
                  key: 'linkedAccountId',
                  label: t('transactions.account'),
                  type: 'select',
                  placeholder: t('transactions.filter-account-placeholder'),
                  options: (accounts.data ?? []).map((account) => ({
                    value: account.id,
                    label: account.name,
                  })),
                },
                {
                  key: 'receiverId',
                  label: t('transactions.receiver'),
                  type: 'select',
                  placeholder: t('transactions.filter-receiver-placeholder'),
                  options: (receivers.data ?? []).map((receiver) => ({
                    value: receiver.id,
                    label: receiver.name,
                  })),
                },
                {
                  key: 'type',
                  label: t('transactions.type'),
                  type: 'select',
                  placeholder: t('transactions.filter-type-placeholder'),
                  options: (['Income', 'Expense'] as const).map((value) => ({
                    value,
                    label: t(`transactions.type-${value.toLowerCase()}`),
                  })),
                },
                {
                  key: 'status',
                  label: t('transactions.status'),
                  type: 'select',
                  placeholder: t('transactions.filter-status-placeholder'),
                  options: (['Verify', 'Checked', 'Canceled'] as const).map(
                    (value) => ({
                      value,
                      label: t(`transactions.status-${value.toLowerCase()}`),
                    })
                  ),
                },
              ]}
              values={filter}
              onApply={(values) => {
                setFilter(values)
                setSelection(new Set())
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
              variant="outline"
              onClick={() => {
                transfer.reset()
                setTransferOpen(true)
              }}
            >
              <ArrowLeftRight />
              {t('transactions.transfer')}
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                save.reset()
                setFormOpen(true)
              }}
            >
              <Plus />
              {t('transactions.new')}
            </Button>
          </>
        }
      />
      <SummaryCards
        groups={summary.data?.groups ?? []}
        locale={i18n.language}
        labels={{
          incomes: t('transactions.summary-incomes'),
          expenses: t('transactions.summary-expenses'),
          net: t('transactions.summary-net'),
          creditExpenses: t('transactions.summary-credit-expenses'),
        }}
      />
      <FilterChips chips={chips} />
      <TransactionGrid
        rows={rows}
        locale={i18n.language}
        labels={{
          when: t('transactions.when'),
          category: t('transactions.category'),
          account: t('transactions.account'),
          amount: t('transactions.amount'),
          status: t('transactions.status'),
          selectAll: t('transactions.select-all'),
          selectRow: t('transactions.select-row'),
          groupIncomes: t('transactions.group-incomes'),
          groupExpenses: t('transactions.group-expenses'),
          groupNet: t('transactions.group-net'),
          loading: t('transactions.loading'),
        }}
        selection={selection}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        actions={{
          onEdit: (transaction) => {
            setEditing(transaction)
            save.reset()
            setFormOpen(true)
          },
          onDelete: (transaction) => {
            // Deleting any row cancels the edit in progress: the sheet
            // would otherwise keep editing a row the grid no longer holds.
            setFormOpen(false)
            setEditing(null)
            save.reset()
            setDeleting(transaction)
          },
        }}
        hasMore={hasMore}
        isFetchingNextPage={search.isFetchingNextPage}
        onLoadMore={() => void search.fetchNextPage()}
        emptyMessage={t('transactions.empty')}
      />
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      <TransactionForm
        open={formOpen}
        transaction={editing}
        defaultDt={range.from}
        error={saveError}
        isSaving={save.isPending}
        onSubmit={submitSave}
        onCancel={() => {
          setFormOpen(false)
          setEditing(null)
          save.reset()
        }}
      />
      <TransferForm
        open={transferOpen}
        accounts={accounts.data ?? []}
        defaultDt={range.from}
        error={transferError}
        isSaving={transfer.isPending}
        onSubmit={submitTransfer}
        onCancel={() => {
          setTransferOpen(false)
          transfer.reset()
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        destructive
        title={t('transactions.delete-title')}
        description={t('transactions.delete-description', {
          name: deleting === null ? '' : deleting.name,
        })}
        confirmLabel={t('transactions.delete-confirm')}
        pendingLabel={t('transactions.deleting')}
        cancelLabel={t('transactions.cancel')}
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
