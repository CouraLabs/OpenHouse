import type { Receiver } from '@workspace/poco'

import type { CsvColumn } from '../common/csv/csv.js'

/** The columns of the receivers export, in file order. */
export const RECEIVER_CSV_COLUMNS: readonly CsvColumn<Receiver>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Type', cell: (row) => row.type },
  { header: 'Status', cell: (row) => row.status },
]
