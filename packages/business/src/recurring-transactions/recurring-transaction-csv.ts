import type { RecurringTransaction } from '@workspace/dto'

import { type CsvColumn, money } from '../csv/csv.js'

export const RECURRING_CSV_COLUMNS: readonly CsvColumn<RecurringTransaction>[] =
  [
    { header: 'Receiver', cell: (row) => row.receiverName },
    { header: 'Type', cell: (row) => row.type },
    { header: 'Amount', cell: (row) => money(row.amount) },
    { header: 'Currency', cell: (row) => row.accountCurrency },
    { header: 'Account', cell: (row) => row.accountName },
    { header: 'Category', cell: (row) => row.categoryName },
    { header: 'Frequency', cell: (row) => row.frequency },
    { header: 'Day', cell: (row) => row.frequencyDay },
    { header: 'Month', cell: (row) => row.frequencyMonth },
    { header: 'Status', cell: (row) => row.status },
  ]
