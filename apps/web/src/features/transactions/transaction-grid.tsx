import { useEffect, useMemo, useRef } from 'react'
import type { Currency, Transaction, TransactionStatus } from '@workspace/poco'
import { transactionStatuses } from '@workspace/poco'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Spinner } from '@workspace/ui/components/spinner'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/lib/format-money.js'

/** One currency's slice of a day's totals. A day that spans accounts of
 * two currencies totals each separately — currencies are never summed
 * together. */
export interface DayTotal {
  currency: Currency
  incomes: string
  expenses: string
  net: string
}

/** The rows of one day: the day itself and everything that happened on it. */
export interface DayGroup {
  /** The day, as `YYYY-MM-DD`. */
  day: string
  transactions: Transaction[]
  /** The day's totals, one entry per currency the day's rows carry,
   * richest first — a single-currency day answers one entry. */
  totals: DayTotal[]
}

/** A row of the virtual list: a day's header, or one transaction. */
type GridItem =
  | { kind: 'header'; group: DayGroup }
  | { kind: 'row'; transaction: Transaction; group: DayGroup }

/** What the grid's columns and actions are called, translated by the page. */
export interface TransactionGridLabels {
  description: string
  when: string
  category: string
  amount: string
  status: string
  selectAll: string
  selectRow: string
  groupIncomes: string
  groupExpenses: string
  groupNet: string
  loading: string
}

/** What the actions column can do to a row, reported upward. */
export interface TransactionRowActions {
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  /** Moves the row straight to another review status, from the grid. */
  onStatusChange: (transaction: Transaction, status: TransactionStatus) => void
}

const HEADER_HEIGHT = 40
const ROW_HEIGHT = 44

/**
 * The transactions grid: a virtualized list grouped by day, the group
 * headers sticking at the top of the scroll viewport while their rows
 * scroll under them. Rows come in newest first; the grid groups the
 * consecutive days and totals each one.
 */
export function TransactionGrid({
  rows,
  locale,
  labels,
  selection,
  onToggleRow,
  onToggleAll,
  actions,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
  emptyMessage,
}: {
  /** The loaded transactions, newest first (the search's default sort). */
  rows: Transaction[]
  /** The BCP-47 tag the dates and money format in. */
  locale: string
  labels: TransactionGridLabels
  /** The ids of the selected rows. */
  selection: Set<number>
  onToggleRow: (transaction: Transaction) => void
  onToggleAll: () => void
  actions: TransactionRowActions
  hasMore: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  emptyMessage: string
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupByDay(rows), [rows])
  const items = useMemo<GridItem[]>(
    () =>
      groups.flatMap((group) => [
        { kind: 'header', group } as GridItem,
        ...group.transactions.map(
          (transaction) => ({ kind: 'row', transaction, group }) as GridItem
        ),
      ]),
    [groups]
  )

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      items[index]?.kind === 'header' ? HEADER_HEIGHT : ROW_HEIGHT,
    overscan: 10,
  })

  // The next page loads itself when the visible window nears the end.
  useEffect(() => {
    const range = virtualizer.range

    if (
      range == null ||
      !hasMore ||
      isFetchingNextPage ||
      range.endIndex < items.length - 20
    ) {
      return
    }

    onLoadMore()
  }, [virtualizer.range, hasMore, isFetchingNextPage, items.length, onLoadMore])

  // The group the topmost visible row belongs to sticks at the top when
  // its own header has scrolled past.
  const virtualItems = virtualizer.getVirtualItems()
  const first = virtualItems[0]
  const sticky =
    first !== undefined ? stickyGroupOf(items, first.index) : undefined
  const stickyItem =
    sticky !== undefined
      ? items.find(
          (item) => item.kind === 'header' && item.group.day === sticky
        )
      : undefined

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border p-8 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  const allSelected = rows.every((row) => selection.has(row.id))

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
      {/* The column titles sit above the viewport: they never scroll away,
       * so only the day groups need to stick. */}
      <div className="grid grid-cols-[2.5rem_10rem_1fr_1fr_10rem_7rem_5rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground">
        <Checkbox
          checked={allSelected}
          aria-label={labels.selectAll}
          onCheckedChange={onToggleAll}
        />
        <span>{labels.when}</span>
        <span>{labels.category}</span>
        <span>{labels.description}</span>
        <span className="text-right">{labels.amount}</span>
        <span>{labels.status}</span>
        <span />
      </div>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div
          className="relative"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualItems.map((virtual) => {
            const item = items[virtual.index]

            if (item === undefined) {
              return null
            }

            return (
              <div
                key={virtual.key}
                data-index={virtual.index}
                ref={virtualizer.measureElement}
                className="absolute inset-x-0"
                style={{ transform: `translateY(${virtual.start}px)` }}
              >
                {item.kind === 'header' ? (
                  <DayHeader
                    group={item.group}
                    locale={locale}
                    labels={labels}
                  />
                ) : (
                  <TransactionRow
                    transaction={item.transaction}
                    locale={locale}
                    labels={labels}
                    selected={selection.has(item.transaction.id)}
                    onToggleRow={onToggleRow}
                    actions={actions}
                  />
                )}
              </div>
            )
          })}
          {/* The sticky day header: absolutely positioned at the scroll
           * offset, so it stays pinned at the viewport's top while the
           * group's rows scroll under it — inside the table, never over
           * the page. */}
          {stickyItem !== undefined && stickyItem.kind === 'header' ? (
            <div
              className="absolute inset-x-0 z-10 shadow-sm"
              style={{
                transform: `translateY(${virtualizer.scrollOffset ?? 0}px)`,
              }}
            >
              <DayHeader
                group={stickyItem.group}
                locale={locale}
                labels={labels}
              />
            </div>
          ) : null}
          {isFetchingNextPage ? (
            <div
              className="absolute inset-x-0 flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground"
              style={{
                transform: `translateY(${(virtualizer.scrollOffset ?? 0) + HEADER_HEIGHT}px)`,
              }}
            >
              <Spinner className="size-4" />
              {labels.loading}
            </div>
          ) : null}
        </div>
      </div>
      {hasMore && !isFetchingNextPage ? (
        <div className="border-t p-2 text-center">
          <Button variant="ghost" size="sm" onClick={onLoadMore}>
            {t('transactions.load-more')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/** Answers the day of the group whose header has scrolled past the top for
 * the item at `index` — the item's own group, when the item is a row and
 * its group's header sits above it in the list. */
function stickyGroupOf(items: GridItem[], index: number): string | undefined {
  const first = items[index]

  // Nothing visible, or the window opens on a header: the header itself is
  // at the top, so nothing needs to stick.
  if (first === undefined || first.kind === 'header') {
    return undefined
  }

  // A row: its group's header is earlier in the list, so it has scrolled
  // past — that group sticks.
  return first.group.day
}

/** Groups consecutive rows by day, newest first, totaling each day. The
 * totals never count the two sides of a transfer — the pair books the same
 * money once as an expense and once as an income — nor a Canceled row:
 * money that did not move is not money spent. Rows of different currencies
 * total separately, one entry per currency. */
function groupByDay(rows: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = []

  for (const transaction of rows) {
    const last = groups[groups.length - 1]

    if (last === undefined || last.day !== transaction.transactionDt) {
      groups.push({
        day: transaction.transactionDt,
        transactions: [transaction],
        totals: [],
      })

      continue
    }

    last.transactions.push(transaction)
  }

  for (const group of groups) {
    const totals = new Map<Currency, { incomes: bigint; expenses: bigint }>()

    for (const transaction of group.transactions) {
      if (
        transaction.transferGroupId !== null ||
        transaction.status === 'Canceled'
      ) {
        continue
      }

      const total = totals.get(transaction.currency) ?? {
        incomes: 0n,
        expenses: 0n,
      }

      if (transaction.type === 'Income') {
        total.incomes += toCents(transaction.amount)
      } else {
        total.expenses += toCents(transaction.amount)
      }

      totals.set(transaction.currency, total)
    }

    group.totals = [...totals.entries()].map(([currency, total]) => ({
      currency,
      incomes: formatCents(total.incomes),
      expenses: formatCents(total.expenses),
      net: formatCents(total.incomes - total.expenses),
    }))
  }

  return groups
}

/** Reads a decimal money string into BigInt cents. */
function toCents(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value)

  if (match === null) {
    return 0n
  }

  const [, whole, fraction = ''] = match

  return BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2))
}

/** Formats BigInt cents back into the two-decimal string the rows carry. */
function formatCents(cents: bigint): string {
  const magnitude = (cents < 0n ? -cents : cents).toString().padStart(3, '0')
  const whole = magnitude.slice(0, -2)
  const fraction = magnitude.slice(-2)

  return `${cents < 0n ? '-' : ''}${whole}.${fraction}`
}

/** One day's header: the date, and the day's Incomes / Expenses / Net per
 * currency — one block per currency the day carries. */
function DayHeader({
  group,
  locale,
  labels,
}: {
  group: DayGroup
  locale: string
  labels: TransactionGridLabels
}) {
  const title = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${group.day}T00:00:00`))

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-1.5 text-sm font-medium">
      <span>{title}</span>
      <span className="flex gap-3 text-muted-foreground">
        {group.totals.map((total) => (
          <span key={total.currency} className="flex gap-3">
            <span>
              {labels.groupIncomes}{' '}
              <span className="text-emerald-600 dark:text-emerald-400">
                {formatMoney(total.incomes, locale, total.currency)}
              </span>
            </span>
            <span>
              {labels.groupExpenses}{' '}
              <span className="text-red-600 dark:text-red-400">
                {formatMoney(total.expenses, locale, total.currency)}
              </span>
            </span>
            <span>
              {labels.groupNet}{' '}
              <span className="tabular-nums">
                {formatMoney(total.net, locale, total.currency)}
              </span>
            </span>
          </span>
        ))}
      </span>
    </div>
  )
}

/** One transaction's row: when, category with the account it moved
 * through, description, amount, status, actions. */
function TransactionRow({
  transaction,
  locale,
  labels,
  selected,
  onToggleRow,
  actions,
}: {
  transaction: Transaction
  locale: string
  labels: TransactionGridLabels
  selected: boolean
  onToggleRow: (transaction: Transaction) => void
  actions: TransactionRowActions
}) {
  const { t } = useTranslation()
  const isIncome = transaction.type === 'Income'
  const signed = `${isIncome ? '+' : '\u2212'}${formatMoney(transaction.amount, locale, transaction.currency)}`

  return (
    <div className="grid grid-cols-[2.5rem_10rem_1fr_1fr_10rem_7rem_5rem] items-center gap-2 border-b px-3 py-2 text-sm hover:bg-muted/40">
      <Checkbox
        checked={selected}
        aria-label={labels.selectRow}
        onCheckedChange={() => onToggleRow(transaction)}
      />
      <span className="tabular-nums">
        {new Intl.DateTimeFormat(locale, {
          day: '2-digit',
          month: '2-digit',
        }).format(new Date(`${transaction.transactionDt}T00:00:00`))}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        <Badge
          variant="outline"
          style={
            transaction.categoryColor === ''
              ? undefined
              : {
                  borderColor: transaction.categoryColor,
                  color: transaction.categoryColor,
                }
          }
        >
          {transaction.categoryName}
        </Badge>
        <span
          className="truncate text-muted-foreground"
          title={transaction.accountName}
        >
          {transaction.accountName}
        </span>
      </span>
      <span className="truncate" title={transaction.name}>
        {transaction.name}
      </span>
      <span
        className={`text-right font-medium tabular-nums ${
          isIncome
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {signed}
      </span>
      <span>
        <StatusBadge
          status={transaction.status}
          onChange={(status) => actions.onStatusChange(transaction, status)}
          t={t}
        />
      </span>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('transactions.edit')}
          title={t('transactions.edit')}
          onClick={() => actions.onEdit(transaction)}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          aria-label={t('transactions.delete')}
          title={t('transactions.delete')}
          onClick={() => actions.onDelete(transaction)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

/** The review workflow's badge: Verify neutral, Checked green, Canceled
 * red. Clicking it opens the other statuses — picking one changes the row
 * straight from the grid, no form needed. */
function StatusBadge({
  status,
  onChange,
  t,
}: {
  status: Transaction['status']
  onChange: (status: TransactionStatus) => void
  t: (key: string) => string
}) {
  const variants = {
    Verify: 'secondary',
    Checked: 'default',
    Canceled: 'destructive',
  } as const

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('transactions.status-change')}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Badge variant={variants[status]}>
          {t(`transactions.status-${status.toLowerCase()}`)}
        </Badge>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {transactionStatuses.map((value) => (
          <DropdownMenuItem
            key={value}
            disabled={value === status}
            onClick={() => onChange(value)}
          >
            {t(`transactions.status-${value.toLowerCase()}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
