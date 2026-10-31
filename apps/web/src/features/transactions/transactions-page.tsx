import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  CreateTransactionBody,
  CreditMode,
  ReconciledEditConflict,
  SearchTransactionsArgs,
  Transaction,
  TransactionStatus,
  TransactionType,
  TransferBody,
} from '@workspace/dto'
import {
  ArrowLeftRight,
  Gauge,
  PieChart,
  Plus,
  Target,
  Wallet,
} from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import { ConfirmDialog } from '@workspace/ui/components/confirm-dialog'
import {
  FilterDialog,
  type FilterValues,
} from '@workspace/ui/components/filter-dialog'
import { useExportCsv } from '@/components/export-csv-button.js'
import { PageHeader } from '@/components/page-header.js'
import { formatDateOnly } from '@/lib/format-date-only.js'
import { useMainCurrency, useTenantToday } from '@/lib/settings.js'
import { ClosedBillDialog } from './closed-bill-dialog.js'
import { CurrentBillCard } from './current-bill-card.js'
import { ExpensePieCard } from './expense-pie-card.js'
import { TransactionWindowNotice } from './transaction-window-notice.js'
import { FilterChips, type FilterChipValue } from './filter-chips.js'
import { InstallmentGroupDialog } from './installment-group-dialog.js'
import { GoalGaugesCard } from './goal-gauges-card.js'
import { LastMonthCard } from './last-month-card.js'
import { LimitUsageCard } from './limit-usage-card.js'
import { MonthFilter } from './month-filter.js'
import { NextDueCard } from './next-due-card.js'
import { NextMonthCard } from './next-month-card.js'
import { reconciledConflictOf } from './reconciled-conflict.js'
import { ReconciledEditDialog } from './reconciled-edit-dialog.js'
import { SplitInstallmentsDialog } from './split-installments-dialog.js'
import { SummaryCards } from './summary-cards.js'
import { mainCurrencyFirst } from '@/lib/main-currency-first.js'
import { TransactionForm } from './transaction-form.js'
import { TransactionGrid } from './transaction-grid.js'
import { TransferForm } from './transfer-form.js'
import { TransactionsMoreMenu } from './transactions-more-menu.js'
import { type TransactionsView, ViewToggle } from './view-toggle.js'
import {
  useCurrentBills,
  useExpenseBreakdown,
  useGoals,
  useNextDueBills,
  useLimitUsage,
} from './use-dashboard.js'
import {
  useActiveAccounts,
  useActiveCategories,
  useActiveReceivers,
  useChangeTransactionStatus,
  useDeleteTransaction,
  useSaveTransaction,
  useTransactionsInfinite,
  useTransfer,
  useTransactionSummary,
} from './use-transactions.js'
import { formattingLocale } from '@/lib/i18n.js'

function monthRange(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)

  return { from: formatDateOnly(from), to: formatDateOnly(to) }
}

function shiftMonth(anchor: Date, months: number): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth() + months, 1)
}

export function TransactionsPage() {
  const { t } = useTranslation()
  const mainCurrency = useMainCurrency()
  const today = useTenantToday()

  const [anchor, setAnchor] = useState(() => {
    const [year, month] = today.split('-').map(Number)

    return new Date(year, month - 1, 1)
  })
  const range = monthRange(anchor)

  const [filter, setFilter] = useState<FilterValues>({})

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const [groupOf, setGroupOf] = useState<Transaction | null>(null)
  const [splitting, setSplitting] = useState<Transaction | null>(null)

  const [selection, setSelection] = useState<Set<number>>(new Set())

  const [view, setView] = useState<TransactionsView>('transactions')

  const [creditMode, setCreditMode] = useState<CreditMode>('accrual')

  const [closedNotice, setClosedNotice] = useState<Transaction | null>(null)

  const [lockedChange, setLockedChange] = useState<{
    conflict: ReconciledEditConflict
    retry: () => void
  } | null>(null)

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
        creditMode,
        lifecycle: 'ACTIVE' as const,
      },
      skip: 0,
      limit: 50,
    }),
    [range.from, range.to, filter, creditMode]
  )

  const search = useTransactionsInfinite(args)
  const summary = useTransactionSummary(args.filter)
  const exportCsv = useExportCsv('/transactions/export', args)
  const save = useSaveTransaction()
  const remove = useDeleteTransaction()
  const transfer = useTransfer()
  const statusChange = useChangeTransactionStatus()

  const categoryArgs = useMemo<
    SearchTransactionsArgs['filter'] & { dimension: 'category' }
  >(() => ({ ...args.filter, dimension: 'category' }), [args.filter])
  const accountArgs = useMemo<
    SearchTransactionsArgs['filter'] & { dimension: 'account' }
  >(() => ({ ...args.filter, dimension: 'account' }), [args.filter])
  const categoryBreakdown = useExpenseBreakdown(categoryArgs)
  const accountBreakdown = useExpenseBreakdown(accountArgs)
  const lastMonthRange = useMemo(
    () => monthRange(shiftMonth(anchor, -1)),
    [anchor]
  )
  const lastMonthSummary = useTransactionSummary({
    transactionDtFrom: lastMonthRange.from,
    transactionDtTo: lastMonthRange.to,
    creditMode,
    lifecycle: 'ACTIVE' as const,
  })
  const goals = useGoals()
  const limitUsage = useLimitUsage()
  const currentBills = useCurrentBills()
  const nextDueBills = useNextDueBills()

  const nextMonthSlices = summary.data?.forecastNextMonth ?? []

  const rows = useMemo(
    () => (search.data?.pages ?? []).flatMap((page) => page.items),
    [search.data]
  )
  const hasMore = search.hasNextPage

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
  const statusChangeError = statusChange.isError
    ? statusChange.error instanceof Error
      ? statusChange.error.message
      : t('transactions.error')
    : undefined

  const monthLabel = new Intl.DateTimeFormat(formattingLocale(), {
    month: 'long',
    year: 'numeric',
  }).format(anchor)

  const chips = useMemo(() => {
    const list: FilterChipValue[] = []

    if (creditMode === 'cash') {
      list.push({
        label: `${t('transactions.mode')}: ${t('transactions.mode-cash')}`,
        onClear: () => setCreditMode('accrual'),
      })
    }

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
  }, [t, creditMode, filter, categories.data, accounts.data, receivers.data])

  const submitSave = (
    body: CreateTransactionBody,
    confirmReconciled = false
  ) => {
    const payload = editing === null ? body : { ...body, id: editing.id }

    save.mutate(
      confirmReconciled ? { ...payload, confirmReconciled } : payload,
      {
        onSuccess: (saved) => {
          setFormOpen(false)
          setEditing(null)
          setSelection(new Set())
          setLockedChange(null)

          if (saved.warning === 'STATEMENT_CLOSED') {
            setClosedNotice(saved)
          }
        },
        onError: (error) => {
          const conflict = reconciledConflictOf(error)

          if (conflict !== null) {
            save.reset()
            setLockedChange({
              conflict,
              retry: () => submitSave(body, true),
            })
          }
        },
      }
    )
  }

  const changeStatus = (
    transaction: Transaction,
    status: TransactionStatus,
    confirmReconciled = false
  ) => {
    statusChange.mutate(
      { id: transaction.id, status, confirmReconciled },
      {
        onSuccess: () => setLockedChange(null),
        onError: (error) => {
          const conflict = reconciledConflictOf(error)

          if (conflict !== null) {
            statusChange.reset()
            setLockedChange({
              conflict,
              retry: () => changeStatus(transaction, status, true),
            })
          }
        },
      }
    )
  }

  const openNew = () => {
    setEditing(null)
    save.reset()
    setFormOpen(true)
  }

  const openTransfer = () => {
    transfer.reset()
    setTransferOpen(true)
  }

  const intent = useSearch({ from: '/_main/transactions' })
  const navigate = useNavigate()

  useEffect(() => {
    if (intent.new !== true && intent.transfer !== true) {
      return
    }

    if (intent.new === true) {
      setEditing(null)
      save.reset()
      setFormOpen(true)
    } else {
      transfer.reset()
      setTransferOpen(true)
    }

    void navigate({ to: '/transactions', search: {}, replace: true })
  }, [intent.new, intent.transfer, navigate, save, transfer])

  const submitTransfer = (body: TransferBody) => {
    transfer.mutate(body, {
      onSuccess: () => {
        setTransferOpen(false)
        transfer.reset()
      },
    })
  }

  const confirmDelete = (target = deleting, confirmReconciled = false) => {
    if (target === null) {
      return
    }

    remove.mutate(
      { id: target.id, confirmReconciled },
      {
        onSuccess: () => {
          setDeleting(null)
          setLockedChange(null)
          setFormOpen(false)
          setEditing(null)
          save.reset()
        },
        onError: (error) => {
          const conflict = reconciledConflictOf(error)

          if (conflict !== null) {
            remove.reset()
            setDeleting(null)
            setLockedChange({
              conflict,
              retry: () => confirmDelete(target, true),
            })
          }
        },
      }
    )
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
    <main className="mx-auto flex h-full min-h-0 w-full max-w-[90rem] animate-page-in flex-col gap-6 px-4 pt-4 pb-24 md:px-8 md:pt-6 md:pb-10">
      <PageHeader
        title={t('transactions.title')}
        subtitle={t('transactions.subtitle')}
        actions={
          <>
            <ViewToggle
              value={view}
              onChange={setView}
              labels={{
                group: t('transactions.view'),
                transactions: t('transactions.view-transactions'),
                metrics: t('transactions.view-metrics'),
              }}
            />
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
              className="max-md:hidden"
              onClick={openTransfer}
            >
              <ArrowLeftRight />
              {t('transactions.transfer')}
            </Button>
            <TransactionsMoreMenu
              exportArgs={args}
              csv={exportCsv}
              creditMode={creditMode}
              onCreditModeChange={setCreditMode}
              onTransfer={openTransfer}
              labels={{
                trigger: t('transactions.more-actions'),
                transfer: t('transactions.transfer'),
                mode: t('transactions.mode'),
                accrual: t('transactions.mode-accrual'),
                cash: t('transactions.mode-cash'),
              }}
            />
            <Button
              variant="secondary"
              className="max-md:hidden"
              onClick={openNew}
            >
              <Plus />
              {t('transactions.new')}
            </Button>
          </>
        }
      />
      {exportCsv.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('export.csv-error')}
        </p>
      ) : null}
      <TransactionWindowNotice />
      <FilterChips chips={chips} />
      {view === 'metrics' ? (
        <>
          <SummaryCards
            groups={mainCurrencyFirst(summary.data?.groups ?? [], mainCurrency)}
            locale={formattingLocale()}
            labels={{
              incomes: t('transactions.summary-incomes'),
              expenses: t('transactions.summary-expenses'),
              net: t('transactions.summary-net'),
              creditExpenses: t('transactions.summary-credit-expenses'),
            }}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <CurrentBillCard
              title={t('transactions.dashboard-current-bill')}
              bills={currentBills}
              today={today}
              locale={formattingLocale()}
              labels={{
                empty: t('transactions.dashboard-bills-empty'),
                closesIn: (days) =>
                  t('transactions.dashboard-closes-in', { count: days }),
              }}
            />
            <NextDueCard
              title={t('transactions.dashboard-next-due')}
              bills={nextDueBills}
              locale={formattingLocale()}
              labels={{
                empty: t('transactions.dashboard-next-due-empty'),
                dueOn: (due) => t('transactions.dashboard-due-on', { due }),
                overdue: t('transactions.dashboard-overdue'),
                pay: t('transactions.dashboard-pay'),
              }}
            />
            <ExpensePieCard
              title={t('transactions.dashboard-category-expenses')}
              icon={<PieChart aria-hidden className="size-4" />}
              groups={mainCurrencyFirst(
                categoryBreakdown.data?.groups ?? [],
                mainCurrency
              )}
              locale={formattingLocale()}
              labels={{
                other: t('transactions.dashboard-other'),
                empty: t('transactions.dashboard-empty'),
              }}
            />
            <ExpensePieCard
              title={t('transactions.dashboard-account-expenses')}
              icon={<Wallet aria-hidden className="size-4" />}
              groups={mainCurrencyFirst(
                accountBreakdown.data?.groups ?? [],
                mainCurrency
              )}
              locale={formattingLocale()}
              labels={{
                other: t('transactions.dashboard-other'),
                empty: t('transactions.dashboard-empty'),
              }}
            />
            <LastMonthCard
              title={t('transactions.dashboard-last-month')}
              groups={mainCurrencyFirst(
                lastMonthSummary.data?.groups ?? [],
                mainCurrency
              )}
              locale={formattingLocale()}
              labels={{
                incomes: t('transactions.summary-incomes'),
                expenses: t('transactions.summary-expenses'),
              }}
            />
            <NextMonthCard
              title={t('transactions.dashboard-next-month')}
              slices={mainCurrencyFirst(nextMonthSlices, mainCurrency)}
              locale={formattingLocale()}
              labels={{
                expected: t('transactions.dashboard-next-month-expected'),
                empty: t('transactions.dashboard-next-month-empty'),
              }}
            />
            <GoalGaugesCard
              title={t('transactions.dashboard-goals')}
              icon={<Target aria-hidden className="size-4" />}
              goals={goals.data?.items ?? []}
              locale={formattingLocale()}
              ariaLabelFor={(goal) =>
                t('transactions.dashboard-goal-aria', { name: goal.name })
              }
              labels={{
                empty: t('transactions.dashboard-goals-empty'),
                currencyMismatch: t('goals.currency-mismatch'),
              }}
            />
            <LimitUsageCard
              title={t('transactions.dashboard-limits')}
              icon={<Gauge aria-hidden className="size-4" />}
              usage={limitUsage.data ?? []}
              locale={formattingLocale()}
              labels={{
                empty: t('transactions.dashboard-limits-empty'),
                aria: (limit) =>
                  t('transactions.dashboard-limit-aria', {
                    name: limit.categoryName,
                  }),
                excluded: (limit) =>
                  t('transactions.dashboard-limit-excluded', {
                    count: limit.excludedCount,
                  }),
              }}
            />
          </div>
        </>
      ) : (
        <TransactionGrid
          rows={rows}
          locale={formattingLocale()}
          labels={{
            description: t('transactions.name'),
            when: t('transactions.when'),
            category: t('transactions.category-account'),
            amount: t('transactions.amount'),
            status: t('transactions.status'),
            selectAll: t('transactions.select-all'),
            gridLabel: t('transactions.grid-label'),
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
              setFormOpen(false)
              setEditing(null)
              save.reset()
              setDeleting(transaction)
            },
            onInstallments: (transaction) => {
              setFormOpen(false)
              setEditing(null)
              save.reset()
              setSelection(new Set())
              setGroupOf(transaction)
            },
            onSplit: (transaction) => {
              setFormOpen(false)
              setEditing(null)
              save.reset()
              setSelection(new Set())
              setSplitting(transaction)
            },
            onStatusChange: changeStatus,
          }}
          hasMore={hasMore}
          isFetchingNextPage={search.isFetchingNextPage}
          onLoadMore={() => void search.fetchNextPage()}
          emptyMessage={t('transactions.empty')}
        />
      )}
      {deleteError ? (
        <p className="text-sm text-destructive">{deleteError}</p>
      ) : null}
      {!formOpen && (saveError ?? statusChangeError) ? (
        <p className="text-sm text-destructive">
          {saveError ?? statusChangeError}
        </p>
      ) : null}
      <Button
        size="lg"
        className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-20 shadow-lg md:hidden"
        onClick={openNew}
      >
        <Plus />
        {t('transactions.new')}
      </Button>
      <TransactionForm
        open={formOpen}
        transaction={editing}
        defaultDt={today}
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
        error={transferError}
        isSaving={transfer.isPending}
        onSubmit={submitTransfer}
        onCancel={() => {
          setTransferOpen(false)
          transfer.reset()
        }}
      />
      <ClosedBillDialog
        transaction={closedNotice}
        onClose={() => setClosedNotice(null)}
      />
      <InstallmentGroupDialog
        transaction={groupOf}
        onClose={() => setGroupOf(null)}
      />
      <SplitInstallmentsDialog
        transaction={splitting}
        onClose={() => setSplitting(null)}
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
        onConfirm={() => confirmDelete()}
      />
      <ReconciledEditDialog
        conflict={lockedChange?.conflict ?? null}
        isPending={save.isPending || remove.isPending || statusChange.isPending}
        onCancel={() => setLockedChange(null)}
        onConfirm={() => lockedChange?.retry()}
      />
    </main>
  )
}
