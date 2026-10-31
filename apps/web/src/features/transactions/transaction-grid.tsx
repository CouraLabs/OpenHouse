import { useEffect, useMemo, useRef, useState } from 'react'
import type { Transaction, TransactionStatus } from '@workspace/dto'
import { Button } from '@workspace/ui/components/button'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Spinner } from '@workspace/ui/components/spinner'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'

import { DayHeader } from './day-header.js'
import { groupByDay, type DayGroup } from './group-by-day.js'
import {
  TransactionCardRow,
  TransactionRow,
} from './transaction-row.js'

type GridItem =
  | { kind: 'header'; group: DayGroup }
  | { kind: 'row'; transaction: Transaction; group: DayGroup }

export interface TransactionGridLabels {
  description: string
  when: string
  category: string
  amount: string
  status: string
  selectAll: string
  gridLabel: string
  selectRow: string
  groupIncomes: string
  groupExpenses: string
  groupNet: string
  loading: string
}

export interface TransactionRowActions {
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  onInstallments: (transaction: Transaction) => void
  onSplit: (transaction: Transaction) => void
  onStatusChange: (transaction: Transaction, status: TransactionStatus) => void
}

const HEADER_HEIGHT = 40
const ROW_HEIGHT = 44
const CARD_ROW_HEIGHT = 68
const DESKTOP_MIN = 1100

function useIsWide(): boolean {
  const [isWide, setIsWide] = useState(true)

  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN}px)`)
    const onChange = () => setIsWide(window.innerWidth >= DESKTOP_MIN)

    mql.addEventListener('change', onChange)
    onChange()

    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isWide
}

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
  rows: Transaction[]
  locale: string
  labels: TransactionGridLabels
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
  const isMobile = !useIsWide()

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
      items[index]?.kind === 'header'
        ? HEADER_HEIGHT
        : isMobile
          ? CARD_ROW_HEIGHT
          : ROW_HEIGHT,
    overscan: 10,
  })

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
    <div
      role={isMobile ? undefined : 'table'}
      aria-label={isMobile ? undefined : labels.gridLabel}
      className="flex min-h-0 flex-1 flex-col rounded-lg border"
    >
      {!isMobile ? (
        <div
          role="row"
          className="grid grid-cols-[2.5rem_10rem_1fr_1fr_10rem_7rem_7rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground"
        >
          <span role="columnheader">
            <Checkbox
              checked={allSelected}
              aria-label={labels.selectAll}
              onCheckedChange={onToggleAll}
            />
          </span>
          <span role="columnheader">{labels.when}</span>
          <span role="columnheader">{labels.category}</span>
          <span role="columnheader">{labels.description}</span>
          <span role="columnheader" className="text-right">
            {labels.amount}
          </span>
          <span role="columnheader">{labels.status}</span>
          <span role="columnheader" />
        </div>
      ) : null}
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
                ) : isMobile ? (
                  <TransactionCardRow
                    transaction={item.transaction}
                    locale={locale}
                    actions={actions}
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

function stickyGroupOf(items: GridItem[], index: number): string | undefined {
  const first = items[index]

  if (first === undefined || first.kind === 'header') {
    return undefined
  }

  return first.group.day
}
