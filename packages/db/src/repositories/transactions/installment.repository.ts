import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import { toCents, type SplitShare } from '@workspace/domain'
import type { Database } from '../../database.js'
import {
  balanceDeltaStatement,
  balanceSubselect,
  LedgerBatchPlan,
  stampFor,
} from '../../ledger/ledger-batch.js'
import { auditedUpdateStatements } from '../../ledger/transaction-history.js'
import { centsToDecimalSql } from '../../money-sql.js'
import {
  creditCardStatements,
  transactionSplits,
  transactions,
  type Transaction,
} from '../../schema.js'

export interface InstallmentState {
  id: number
  amount: string
  installmentNumber: number
  closeDate: string | null
}

export interface GroupMeta {
  name: string
  note: string | null
  categoryId: number
  receiverId: number | null
  paidByUserId?: number
}

export class InstallmentRepository {
  constructor(private readonly db: Database) {}

  async readGroup(
    tenantId: number,
    groupId: string
  ): Promise<{ rows: Transaction[]; states: InstallmentState[] } | undefined> {
    const found = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.installmentGroupId, groupId),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactions.installmentNumber), asc(transactions.id))

    if (found.length === 0) {
      return undefined
    }

    return { rows: found, states: await this.statesOf(tenantId, found) }
  }

  async findActiveRow(
    tenantId: number,
    id: number
  ): Promise<Transaction | undefined> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.id, id),
          eq(transactions.status, 'ACTIVE')
        )
      )

    return row
  }

  async statesOf(
    tenantId: number,
    rows: readonly Transaction[]
  ): Promise<InstallmentState[]> {
    const ids = rows.flatMap((row) =>
      row.statementId === null ? [] : [row.statementId]
    )
    const bills =
      ids.length === 0
        ? []
        : await this.db
            .select({
              id: creditCardStatements.id,
              closeDate: creditCardStatements.closeDate,
            })
            .from(creditCardStatements)
            .where(
              and(
                eq(creditCardStatements.tenantId, tenantId),
                inArray(creditCardStatements.id, ids)
              )
            )
    const closes = new Map(bills.map((bill) => [bill.id, bill.closeDate]))

    return rows.map((row) => ({
      id: row.id,
      amount: row.amount,
      installmentNumber: row.installmentNumber ?? 0,
      closeDate:
        row.statementId === null ? null : (closes.get(row.statementId) ?? null),
    }))
  }

  async sharesTotalOf(
    tenantId: number,
    rows: readonly Transaction[]
  ): Promise<SplitShare[]> {
    if (rows.length === 0) {
      return []
    }

    return this.db
      .select({
        userId: transactionSplits.userId,
        share: centsToDecimalSql(sql`sum(${transactionSplits.share})`),
      })
      .from(transactionSplits)
      .where(
        and(
          eq(transactionSplits.tenantId, tenantId),
          eq(transactionSplits.status, 'ACTIVE'),
          inArray(
            transactionSplits.transactionId,
            rows.map((row) => row.id)
          )
        )
      )
      .groupBy(transactionSplits.userId)
      .orderBy(asc(transactionSplits.userId))
  }

  planRewrite(
    tenantId: number,
    userId: number,
    before: Transaction,
    change: GroupMeta & { amount: string },
    shift: string
  ): LedgerBatchPlan {
    const plan = new LedgerBatchPlan()
    const shiftCents = toCents(shift)
    const stamp = stampFor(before)

    if (shiftCents !== 0n) {
      plan.guarded(
        balanceDeltaStatement(
          this.db,
          tenantId,
          before.linkedAccountId,
          shift
        ),
        1,
        'the card account the installment moves (exists and is ACTIVE)'
      )
    }

    const audited = auditedUpdateStatements(this.db, {
      tenantId,
      id: before.id,
      userId,
      before,
      set: {
        ...change,
        balanceOnDt:
          shiftCents === 0n
            ? before.balanceOnDt
            : balanceSubselect(before.linkedAccountId),
        updateBy: userId,
        updateDt: stamp,
      },
      action: 'UPDATE',
    })

    plan.guarded(
      audited.update,
      1,
      'the installment row (optimistic concurrency)'
    )
    plan.add(audited.history)

    return plan
  }
}
