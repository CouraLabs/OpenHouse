import type { Account } from '@workspace/dto'

import { type CsvColumn, day, money } from '../csv/csv.js'

export const ACCOUNT_CSV_COLUMNS: readonly CsvColumn<Account>[] = [
  { header: 'Name', cell: (row) => row.name },
  { header: 'Type', cell: (row) => row.type },
  { header: 'Currency', cell: (row) => row.currency },
  { header: 'Balance', cell: (row) => money(row.balance) },
  { header: 'Opening balance', cell: (row) => money(row.openingBalance) },
  { header: 'Opening date', cell: (row) => day(row.openingDt) },
  { header: 'Agency', cell: (row) => row.agency },
  { header: 'Number', cell: (row) => row.number },
  { header: 'Card limit', cell: (row) => money(row.limit) },
  { header: 'Close day', cell: (row) => row.closeDay },
  { header: 'Due day', cell: (row) => row.dueDay },
  { header: 'Reconciled through', cell: (row) => day(row.reconciledThrough) },
  { header: 'Default', cell: (row) => row.isDefault },
  { header: 'Status', cell: (row) => row.status },
]
