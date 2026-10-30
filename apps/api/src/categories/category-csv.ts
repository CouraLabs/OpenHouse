import type { Category } from '@workspace/poco'

import type { CsvColumn } from '../common/csv/csv.js'

export const CATEGORY_CSV_COLUMNS: readonly CsvColumn<Category>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Color', cell: (row) => row.color },
  { header: 'Status', cell: (row) => row.status },
]
