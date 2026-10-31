import type {
  AccountType,
  BilledOnPreview,
  Currency,
  EntityStatus,
  StatementWarning,
  Transaction,
  TransactionSplitShare,
  TransactionType,
} from '@workspace/dto'

import { cardCycleOf } from '../calc/credit-card-cycle.js'
import { isLocked } from './transaction-ledger.js'
import {
  displayCloseDate,
  resolveStatement,
} from '../calc/credit-card-cycle.js'

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
    locked: isLocked(row),
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
    billedOn: billedOnFor(row),
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

function billedOnFor(row: TransactionRowLike): BilledOnPreview | null {
  if (row.statementDueDate !== null && row.statementCloseDate != null) {
    return {
      dueDate: row.statementDueDate,
      closeDate: displayCloseDate(
        { closeDayInclusive: row.accountCloseDayInclusive ?? false },
        { closeDate: row.statementCloseDate }
      ),
    }
  }

  if (row.accountType !== 'Credit Card') {
    return null
  }

  const cycle = cardCycleOf({
    closeDay: row.accountCloseDay ?? null,
    dueDay: row.accountDueDay ?? null,
    closeDayInclusive: row.accountCloseDayInclusive ?? false,
  })

  if (cycle === null) {
    return null
  }

  const window = resolveStatement(cycle, row.transactionDt)

  return {
    dueDate: window.dueDate,
    closeDate: displayCloseDate(cycle, window),
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
  accountReconciledThrough: string | null
  linkedAccountId: number
  accountName: string
  accountType?: AccountType
  accountCloseDay?: number | null
  accountDueDay?: number | null
  accountCloseDayInclusive?: boolean
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
  statementCloseDate?: string | null
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
