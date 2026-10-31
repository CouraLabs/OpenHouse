import type {
  PlannedDelete,
  PlannedSibling,
  PlannedStatusFlip,
  PlannedTransaction,
  PlannedUpdate,
  SplitDefaultsInputs,
  Transaction,
  TransactionColumns,
  TransactionRepository,
  TransactionWrite,
} from '@workspace/db'
import {
  STATEMENT_CLOSED,
  type SplitShare,
  type StatementWarning,
  type TransactionStatus,
} from '@workspace/dto'

import { toCents } from '../calc/money.js'
import { allocateByWeights } from '../calc/splits.js'
import {
  assignedOf,
  type StatementPlacer,
} from '../credit-card-statements/statement-placer.js'
import {
  appliedDeltaFor,
  revertDeltaFor,
  shiftDeltaFor,
} from './transaction-ledger.js'

export interface TransferWrite {
  amount: string
  transactionDt: string
  categoryId: number
  fromAccountId: number
  toAccountId: number
  note: string | null
  paymentStatementId: number | null
  settlement?: { fromUserId: number; toUserId: number }
}

export class TransactionPlanner {
  constructor(
    private readonly transactions: Pick<
      TransactionRepository,
      'splitDefaultsOf'
    >,
    private readonly placer: Pick<StatementPlacer, 'place' | 'replace'>
  ) {}

  async insert(
    tenantId: number,
    userId: number | null,
    write: TransactionWrite
  ): Promise<PlannedTransaction> {
    const { installment, splits, paidByUserId, ...rest } = write
    const columns: TransactionColumns = {
      ...rest,
      paidByUserId: paidByUserId === undefined ? userId : paidByUserId,
    }
    const target = await this.placer.place(
      tenantId,
      {
        linkedAccountId: write.linkedAccountId,
        transactionDt: write.transactionDt,
        type: write.type,
        isTransferLeg: write.transferGroupId !== undefined,
      },
      installment === undefined
        ? {}
        : {
            offset: installment.billOffset ?? installment.number - 1,
            pinned: true,
          }
    )

    return {
      columns,
      ...(installment === undefined
        ? {}
        : {
            installment: {
              groupId: installment.groupId,
              number: installment.number,
              count: installment.count,
            },
          }),
      target,
      delta: appliedDeltaFor(write),
      shares: splits ?? (await this.defaultShares(tenantId, columns)),
    }
  }

  async update(
    tenantId: number,
    before: Transaction,
    write: TransactionWrite,
    sibling: Transaction | undefined
  ): Promise<PlannedUpdate> {
    const { splits, installment, ...columns } = write
    const target = await this.placer.replace(tenantId, assignedOf(before), {
      linkedAccountId: write.linkedAccountId,
      transactionDt: write.transactionDt,
      type: write.type,
      isTransferLeg: before.transferGroupId !== null,
    })

    return {
      columns,
      target,
      revert: revertDeltaFor(before),
      apply: appliedDeltaFor(write),
      ...(splits === undefined ? {} : { splits }),
      ...(sibling === undefined
        ? {}
        : { sibling: await this.siblingOf(tenantId, sibling, write) }),
    }
  }

  async transferLegs(
    tenantId: number,
    userId: number,
    write: TransferWrite
  ): Promise<[PlannedTransaction, PlannedTransaction]> {
    const transferGroupId = crypto.randomUUID()
    const from = await this.insert(tenantId, userId, {
      name: 'TRANSFER_OUT',
      note: write.note,
      invoice: 'TRANSFER',
      amount: write.amount,
      transactionDt: write.transactionDt,
      linkedAccountId: write.fromAccountId,
      categoryId: write.categoryId,
      receiverId: null,
      recurringId: null,
      type: 'Expense',
      reviewStatus: 'Verify',
      statusNote: null,
      transferGroupId,
      paidByUserId: write.settlement?.fromUserId ?? null,
      isSettlement: write.settlement !== undefined,
      ...(write.settlement === undefined
        ? {}
        : {
            splits: [
              { userId: write.settlement.toUserId, share: write.amount },
            ],
          }),
    })
    const to = await this.insert(tenantId, userId, {
      name: 'TRANSFER_IN',
      note: write.note,
      invoice: 'TRANSFER',
      amount: write.amount,
      transactionDt: write.transactionDt,
      linkedAccountId: write.toAccountId,
      categoryId: write.categoryId,
      receiverId: null,
      recurringId: null,
      type: 'Income',
      reviewStatus: 'Verify',
      statusNote: null,
      transferGroupId,
      paidByUserId: null,
      isSettlement: write.settlement !== undefined,
      splits: [],
      ...(write.paymentStatementId === null
        ? {}
        : { paymentStatementId: write.paymentStatementId }),
    })

    return [from, to]
  }

  private async siblingOf(
    tenantId: number,
    sibling: Transaction,
    write: TransactionWrite
  ): Promise<PlannedSibling> {
    return {
      row: sibling,
      shift: shiftDeltaFor(sibling, {
        type: sibling.type,
        amount: write.amount,
        reviewStatus: write.reviewStatus,
      }),
      target: await this.placer.replace(tenantId, assignedOf(sibling), {
        linkedAccountId: sibling.linkedAccountId,
        transactionDt: write.transactionDt,
        type: sibling.type,
        isTransferLeg: true,
      }),
      set: {
        amount: write.amount,
        transactionDt: write.transactionDt,
        categoryId: write.categoryId,
        note: write.note,
        reviewStatus: write.reviewStatus,
        statusNote: write.statusNote,
      },
    }
  }

  private async defaultShares(
    tenantId: number,
    columns: TransactionColumns
  ): Promise<SplitShare[]> {
    if (
      columns.type !== 'Expense' ||
      columns.paidByUserId === null ||
      columns.transferGroupId !== undefined ||
      columns.isAdjustment === true ||
      columns.isSettlement === true
    ) {
      return []
    }

    return defaultSplitShares(
      columns.amount,
      columns.paidByUserId,
      await this.transactions.splitDefaultsOf(tenantId, columns.linkedAccountId)
    )
  }
}

export function defaultSplitShares(
  amount: string,
  payerUserId: number,
  inputs: SplitDefaultsInputs
): SplitShare[] {
  if (
    inputs.unsplitMode !== 'household' ||
    inputs.ownership === 'shared' ||
    inputs.memberIds.length === 0
  ) {
    return []
  }

  return allocateByWeights(
    toCents(amount),
    inputs.memberIds.map((userId) => ({ userId, weight: 1n })),
    payerUserId
  )
}

export function plannedDeletes(rows: readonly Transaction[]): PlannedDelete[] {
  return rows.map((row) => ({ row, revert: revertDeltaFor(row) }))
}

export function plannedStatusFlips(
  rows: readonly Transaction[],
  reviewStatus: TransactionStatus
): PlannedStatusFlip[] {
  return rows.map((row) => ({
    row,
    reviewStatus,
    shift: shiftDeltaFor(row, { ...row, reviewStatus }),
  }))
}

export function withClosedWarning<T extends object>(
  row: T,
  closed: boolean
): T & { warning?: StatementWarning } {
  return closed ? { ...row, warning: STATEMENT_CLOSED } : row
}
