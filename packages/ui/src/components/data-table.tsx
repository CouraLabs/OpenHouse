import {
  functionalUpdate,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type Header,
  type PaginationState,
  type RowData,
  type SortingState,
  flexRender,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from 'cn'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Spinner } from '@workspace/ui/components/spinner'
import {
  DataTablePagination,
  type DataTablePaginationLabels,
} from '@workspace/ui/components/data-table-pagination'

/**
 * The features the shared data table runs: sorting and pagination, both
 * driven by the caller (the server owns the data; the table only reports
 * intent). Statically outside the component, as the library prescribes.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
})

/** A column definition of the shared data table. */
export type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  unknown
>

/**
 * The props of the shared data table. The state is owned by the caller —
 * sorting and paging are server concerns here, so the table renders what it
 * is told and reports the user's intent upward.
 */
export interface DataTableProps<TData extends RowData> {
  columns: Array<DataTableColumn<TData>>
  data: TData[]
  /** How many rows match the current query in all, across every page. */
  total: number
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  isLoading?: boolean
  emptyMessage?: string
  /** Slot above the table body: filter inputs and similar controls. */
  /** The translated labels the pagination bar renders. */
  paginationLabels?: DataTablePaginationLabels
}

/**
 * The shared data table: sorting by column header, server-driven paging,
 * zebra rows that highlight on hover, and a layout that scrolls horizontally
 * when the screen is too small to fit the columns. The filter and insert
 * controls belong to the page's header line, not the table.
 */
export function DataTable<TData extends RowData>({
  columns,
  data,
  total,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  isLoading = false,
  emptyMessage = 'No results.',
  paginationLabels,
}: DataTableProps<TData>) {
  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    rowCount: total,
    manualSorting: true,
    manualPagination: true,
    state: { sorting, pagination },
    onSortingChange: (updater) =>
      onSortingChange(functionalUpdate(updater, sorting)),
    onPaginationChange: (updater) =>
      onPaginationChange(functionalUpdate(updater, pagination)),
  })

  return (
    <div className="flex flex-col gap-2">
      <div className="relative min-w-0 overflow-hidden rounded-[1.25rem] bg-card shadow-soft ring-1 ring-foreground/[0.06]">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <Spinner className="size-6" />
          </div>
        ) : null}
        <Table className="min-w-[40rem]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <DataTableHead key={header.id} header={header} />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row, index) => (
                <TableRow
                  key={row.id}
                  className={cn(index % 2 === 1 && 'bg-muted/30')}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} labels={paginationLabels} />
    </div>
  )
}

/** One header cell: sortable when the column says so. */
function DataTableHead<TData extends RowData>({
  header,
}: {
  header: Header<typeof dataTableFeatures, TData, unknown>
}) {
  const column = header.column
  const sorted = column.getIsSorted()
  const sortable = column.columnDef.enableSorting !== false

  const rendered = flexRender(column.columnDef.header, header.getContext())

  return (
    <TableHead
      aria-sort={
        sorted === 'asc'
          ? 'ascending'
          : sorted === 'desc'
            ? 'descending'
            : undefined
      }
    >
      {sortable && column.getCanSort() ? (
        <button
          type="button"
          className="flex items-center gap-1 hover:text-foreground"
          onClick={column.getToggleSortingHandler()}
        >
          {rendered}
          <SortIcon sorted={sorted} />
        </button>
      ) : (
        rendered
      )}
    </TableHead>
  )
}

/** The icon a sortable header carries, pointing the way it is sorted. */
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') {
    return <ArrowUp className="size-3.5" />
  }

  if (sorted === 'desc') {
    return <ArrowDown className="size-3.5" />
  }

  return <ChevronsUpDown className="size-3.5 opacity-40" />
}
