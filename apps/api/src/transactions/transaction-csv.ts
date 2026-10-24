import type { Transaction } from '@workspace/poco'

import { day, money, type CsvColumn } from '../common/csv/csv.js'

/**
 * The columns of the transactions export, in file order: date, name, type,
 * amount, currency, account, category, receiver, status, note, invoice, the
 * due date of the card bill the charge lands on, and the installment as
 * `k/N`.
 */
export const TRANSACTION_CSV_COLUMNS: readonly CsvColumn<Transaction>[] = [
  { header: 'Date', cell: (row) => day(row.transactionDt) },
  { header: 'Name', cell: (row) => row.name },
  { header: 'Type', cell: (row) => row.type },
  { header: 'Amount', cell: (row) => money(row.amount) },
  { header: 'Currency', cell: (row) => row.currency },
  { header: 'Account', cell: (row) => row.accountName },
  { header: 'Category', cell: (row) => row.categoryName },
  { header: 'Receiver', cell: (row) => row.receiverName },
  { header: 'Status', cell: (row) => row.status },
  { header: 'Note', cell: (row) => row.note },
  { header: 'Invoice', cell: (row) => row.invoice },
  { header: 'Statement due date', cell: (row) => day(row.statementDueDate) },
  { header: 'Installment', cell: (row) => installmentOf(row) },
]

/** `3/10` for the third of ten installments, nothing for a single row. */
export function installmentOf(
  row: Pick<Transaction, 'installmentNumber' | 'installmentCount'>
): string | null {
  return row.installmentNumber === null || row.installmentCount === null
    ? null
    : `${row.installmentNumber}/${row.installmentCount}`
}
