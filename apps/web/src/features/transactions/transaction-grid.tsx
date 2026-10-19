import { useEffect, useMemo, useRef } from 'react'
import type { Transaction, TransactionStatus } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Spinner } from '@workspace/ui/components/spinner'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'

import { DayHeader } from './day-header.js'
import { groupByDay, type DayGroup } from './group-by-day.js'
import { TransactionRow } from './transaction-row.js'

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
