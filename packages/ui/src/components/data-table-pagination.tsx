import type { ReactTable, RowData } from '@tanstack/react-table'
import type { dataTableFeatures } from '@workspace/ui/components/data-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@workspace/ui/components/button'
import {
  NativeSelect,
  NativeSelectOption,
} from '@workspace/ui/components/native-select'

/** The page sizes the rows-per-page picker offers. */
const PAGE_SIZES = [10, 20, 50]

/**
 * The labels the pagination bar renders. The component stays i18n-free —
 * the caller translates; these are the English defaults.
 */
export interface DataTablePaginationLabels {
  rowsPerPage: string
  /** Formats the "Page X of Y" readout. */
  page: (pageIndex: number, pageCount: number) => string
  previous: string
  next: string
}

const DEFAULT_LABELS: DataTablePaginationLabels = {
  rowsPerPage: 'Rows per page',
  page: (page, count) => `Page ${page} of ${count}`,
  previous: 'Previous page',
  next: 'Next page',
}

/**
 * The pagination bar of the shared data table: which page, how many rows a
 * page holds, and the steps between them. Reads the table's (server-driven)
 * pagination state and reports changes through it.
 */
export function DataTablePagination<TData extends RowData>({
  table,
  labels = DEFAULT_LABELS,
}: {
  table: ReactTable<typeof dataTableFeatures, TData>
  labels?: DataTablePaginationLabels
}) {
  const { pageIndex, pageSize } = table.state.pagination
  const pageCount = table.getPageCount()
  const rowCount = table.getRowCount()
  const rowsOnPage = table.getRowModel().rows.length

  // One page and there is nothing to page: the bar would read
  // "Page 1 of 1" with dead arrows, so it stays out of the way.
  if (pageCount <= 1) {
    return null
  }

  const firstRow = rowsOnPage === 0 ? 0 : pageIndex * pageSize + 1
  const lastRow = firstRow + rowsOnPage - 1

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
      <p>
        {firstRow === 0 ? '0' : `${firstRow}–${lastRow}`} of {rowCount}
      </p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          {labels.rowsPerPage}
          <NativeSelect
            className="h-8 w-18 py-0"
            value={pageSize}
            onChange={(event) => table.setPageSize(Number(event.target.value))}
          >
            {PAGE_SIZES.map((size) => (
              <NativeSelectOption key={size} value={size}>
                {size}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <p>{labels.page(pageIndex + 1, pageCount)}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={labels.previous}
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label={labels.next}
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
