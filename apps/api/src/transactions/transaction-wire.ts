import type {
  Currency,
  EntityStatus,
  StatementWarning,
  Transaction,
  TransactionSplitShare,
  TransactionType,
} from '@workspace/poco'

export function toWire(row: TransactionRowLike): Transaction {
  return {
    id: row.id,
    name: row.name,
    note: row.note,
    invoice: row.invoice,
    amount: row.amount,
    transactionDt: row.transactionDt,
    balanceOnDt: row.balanceOnDt,
    runningBalance: row.runningBalance,
    isAdjustment: row.isAdjustment,
    locked: row.locked,
    linkedAccountId: row.linkedAccountId,
    accountName: row.accountName,
    currency: row.currency,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    categoryColor: row.categoryColor,
    receiverId: row.receiverId,
    receiverName: row.receiverName,
    recurringId: row.recurringId,
    type: row.type,
    status: row.reviewStatus,
    statusNote: row.statusNote,
    lifecycle: row.status,
    transferGroupId: row.transferGroupId,
    statementId: row.statementId,
    statementPinned: row.statementPinned,
    statementDueDate: row.statementDueDate,
    paymentStatementId: row.paymentStatementId,
    paymentStatementDueDate: row.paymentStatementDueDate,
    installmentGroupId: row.installmentGroupId,
    installmentNumber: row.installmentNumber,
    installmentCount: row.installmentCount,
    paidByUserId: row.paidByUserId,
    paidByName: row.paidByName,
    isSettlement: row.isSettlement,
    splits: row.splits,
    warning: row.warning ?? null,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}

export interface TransactionRowLike {
  id: number
  name: string
  note: string | null
  invoice: string | null
  amount: string
  transactionDt: string
  balanceOnDt: string
  runningBalance: string
  isAdjustment: boolean
  locked: boolean
  linkedAccountId: number
  accountName: string
  currency: Currency
  categoryId: number
  categoryName: string
  categoryColor: string
  receiverId: number | null
  receiverName: string | null
  recurringId: number | null
  type: TransactionType
  reviewStatus: Transaction['status']
  statusNote: string | null
  status: EntityStatus
  transferGroupId: string | null
  statementId: number | null
  statementPinned: boolean
  statementDueDate: string | null
  paymentStatementId: number | null
  paymentStatementDueDate: string | null
  installmentGroupId: string | null
  installmentNumber: number | null
  installmentCount: number | null
  paidByUserId: number | null
  paidByName: string | null
  isSettlement: boolean
  splits: TransactionSplitShare[]
  warning?: StatementWarning
  createdDt: Date
  updateDt: Date
}
