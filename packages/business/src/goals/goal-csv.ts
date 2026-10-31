import type { Goal } from '@workspace/dto'

import { type CsvColumn, day, money } from '../csv/csv.js'

export const GOAL_CSV_COLUMNS: readonly CsvColumn<Goal>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Account', cell: (row) => row.accountName },
  { header: 'Balance', cell: (row) => money(row.balance) },
  { header: 'Balance date', cell: (row) => day(row.balanceDt) },
  { header: 'Target balance', cell: (row) => money(row.targetBalance) },
  { header: 'Target date', cell: (row) => day(row.targetDt) },
  { header: 'Currency', cell: (row) => row.currency },
  { header: 'Status', cell: (row) => row.status },
]
