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

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
})

export type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData,
  unknown
>

export interface DataTableProps<TData extends RowData> {
  columns: Array<DataTableColumn<TData>>
  data: TData[]
  total: number
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pagination: PaginationState
  onPaginationChange: (pagination: PaginationState) => void
  isLoading?: boolean
  emptyMessage?: string
  paginationLabels?: DataTablePaginationLabels
}

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
      <div className="relative min-w-0 overflow-hidden rounded-[1.25rem] bg-card ring-1 ring-foreground/[0.06]">
        {isLoading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
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

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') {
    return <ArrowUp className="size-3.5" />
  }

  if (sorted === 'desc') {
    return <ArrowDown className="size-3.5" />
  }

  return <ChevronsUpDown className="size-3.5 opacity-40" />
}
