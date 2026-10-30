import type { Limit } from '@workspace/poco'

import { money, type CsvColumn } from '../common/csv/csv.js'

export const LIMIT_CSV_COLUMNS: readonly CsvColumn<Limit>[] = [
  { header: 'Category', cell: (row) => row.categoryName },
  { header: 'Period', cell: (row) => row.type },
  { header: 'Amount', cell: (row) => money(row.amount) },
  { header: 'Currency', cell: (row) => row.currency },
  { header: 'Status', cell: (row) => row.status },
]
