import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Database, DbOrTx, Transaction } from '@workspace/db'
import { creditCardStatements, transactions } from '@workspace/db'
import { isZeroMoney, negateMoney, sumMoney } from '@workspace/poco'

import {
  isOpenInstallment,
  planGroupEdit,
  type InstallmentState,
} from './installment-plan.js'
import {
  TransactionRepository,
  type TransactionRow,
  type TransactionWrite,
} from './transaction.repository.js'
import {
  appliedDeltaFor,
  applyTransactionDelta,
  lockAccounts,
} from './transaction-ledger.js'

/** The fields every installment of a purchase shares. */
export type PurchaseWrite = Omit<TransactionWrite, 'amount' | 'installment'>

/** What a group write answered: done, the group is gone, or a row the
 * rule needs Open was already billed. */
export type GroupOutcome<T> =
  { kind: 'done'; value: T } | { kind: 'missing' } | { kind: 'billed' }

/** The shared fields a group edit writes on every installment. */
export interface GroupMeta {
  name: string
  note: string | null
  categoryId: number
  receiverId: number | null
}

/** A purchase's locked installments, in order, each with its bill's close. */
interface LockedGroup {
  rows: Transaction[]
  states: InstallmentState[]
  allOpen: boolean
  /** The tenant's today the states were read against. */
  today: string
}

/**
 * The installment purchases: N transactions sharing an
 * `installmentGroupId`, each on the next bill of its card. Every write goes
 * through the transaction ledger's shared paths — balances, history, and
 * bill placement exactly as a single row's — inside one database
 * transaction that locks the group's rows by id first, then the card once
 * (#17), the ledger's row-first order.
 *
 * Every installment applies its delta at purchase time: the bank holds the
 * whole purchase against the limit, so a 10× TV takes its full price off
 * the card balance on the day it is bought. Limits count it the same way:
 * each installment keeps the purchase day.
 */
@Injectable()
export class InstallmentRepository {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly ledger: TransactionRepository
  ) {}

  /** Reads a purchase's ACTIVE installments, in order, and whether every
   * one is still on an Open bill. Nothing when none is left. */
  async findGroup(
    tenantId: number,
    groupId: string,
    today: string
  ): Promise<{ rows: TransactionRow[]; allOpen: boolean } | undefined> {
    const rows = await this.ledger.findInstallments(tenantId, groupId)

    if (rows.length === 0) {
      return undefined
    }

    const states = await this.statesInTx(this.db, tenantId, rows)

    return {
      rows,
      allOpen: states.every((state) => isOpenInstallment(state, today)),
    }
  }

  /** Writes a purchase as one installment per part, in one transaction. */
  async create(
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[]
  ): Promise<TransactionRow[]> {
    return this.ledger.inLedgerTx(async (tx) => {
      await lockAccounts(tx, tenantId, [purchase.linkedAccountId])

      return this.insertPartsInTx(tx, tenantId, userId, purchase, parts)
    })
  }

  /**
   * Edits a purchase as a whole: the shared fields on every installment;
   * new amounts in place, or a new count by soft-deleting the group and
   * recreating it under the same id — a money change only while every
   * installment is Open.
   */
  async updateGroup(
    tenantId: number,
    userId: number,
    groupId: string,
    meta: GroupMeta,
    parts: readonly string[],
    today: string
  ): Promise<GroupOutcome<TransactionRow[]>> {
    return this.ledger.inLedgerTx(async (tx) => {
      const group = await this.lockGroupInTx(tx, tenantId, groupId, today)

      if (group === undefined) {
        return { kind: 'missing' }
      }

      const [first] = group.rows
      const plan = planGroupEdit(
        group.states,
        first.installmentCount ?? group.rows.length,
        parts
      )

      if (plan !== 'meta' && !group.allOpen) {
        return { kind: 'billed' }
      }

      if (plan === 'resplit') {
        for (const row of group.rows) {
          await this.ledger.softDeleteInTx(tx, tenantId, userId, row)
        }

        await this.insertPartsInTx(
          tx,
          tenantId,
          userId,
          { ...purchaseOf(first), ...meta },
          parts,
          groupId
        )
      } else {
        for (const [index, row] of group.rows.entries()) {
          await this.rewriteInTx(tx, tenantId, userId, row, {
            ...meta,
            amount: plan === 'amounts' ? parts[index] : row.amount,
          })
        }
      }

      return {
        kind: 'done',
        value: await this.ledger.findInstallments(tenantId, groupId, tx),
      }
    })
  }

  /**
   * Soft-deletes a purchase's installments: `all` — only while none is
   * billed — or the `remaining` ones still on an Open bill (an early payoff
   * or a cancellation); rows on closed bills stay. Answers how many went.
   */
  async deleteGroup(
    tenantId: number,
    userId: number,
    groupId: string,
    scope: 'all' | 'remaining',
    today: string
  ): Promise<GroupOutcome<number>> {
    return this.ledger.inLedgerTx(async (tx) => {
      const group = await this.lockGroupInTx(tx, tenantId, groupId, today)

      if (group === undefined) {
        return { kind: 'missing' }
      }

      if (scope === 'all' && !group.allOpen) {
        return { kind: 'billed' }
      }

      const deleted = await this.deleteOpenInTx(tx, tenantId, userId, group)

      return { kind: 'done', value: deleted.length }
    })
  }

  /**
   * Refunds a purchase in full: deletes the installments still Open, and
   * credits what was already billed as one Income on the card, dated
   * today — so it lands on the open bill. Answers the refund row, or
   * nothing when nothing was billed yet.
   */
  async refundGroup(
    tenantId: number,
    userId: number,
    groupId: string,
    name: string,
    today: string
  ): Promise<GroupOutcome<TransactionRow | null>> {
    return this.ledger.inLedgerTx(async (tx) => {
      const group = await this.lockGroupInTx(tx, tenantId, groupId, today)

      if (group === undefined) {
        return { kind: 'missing' }
      }

      const deleted = new Set(
        await this.deleteOpenInTx(tx, tenantId, userId, group)
      )
      const billed = group.rows.filter(
        (row) => !deleted.has(row.id) && row.reviewStatus !== 'Canceled'
      )

      if (billed.length === 0) {
        return { kind: 'done', value: null }
      }

      const [first] = group.rows
      const refund = await this.ledger.insertInTx(tx, tenantId, userId, {
        ...purchaseOf(first),
        name,
        type: 'Income',
        reviewStatus: 'Verify',
        statusNote: null,
        transactionDt: today,
        amount: sumMoney(billed.map((row) => row.amount)),
      })

      return { kind: 'done', value: refund }
    })
  }

  /**
   * Converts a single card expense into installments while its bill is
   * Open: the row is soft-deleted and the purchase recreated in parts, in
   * the same transaction. The caller checked the row may split.
   */
  async convert(
    tenantId: number,
    userId: number,
    id: number,
    parts: readonly string[],
    today: string
  ): Promise<GroupOutcome<TransactionRow[]>> {
    return this.ledger.inLedgerTx(async (tx) => {
      const [row] = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            eq(transactions.id, id),
            eq(transactions.status, 'ACTIVE')
          )
        )
        .for('update')

      if (row === undefined || row.installmentGroupId !== null) {
        return { kind: 'missing' }
      }

      await lockAccounts(tx, tenantId, [row.linkedAccountId])

      const [state] = await this.statesInTx(tx, tenantId, [row])

      if (!isOpenInstallment(state, today)) {
        return { kind: 'billed' }
      }

      await this.ledger.softDeleteInTx(tx, tenantId, userId, row)

      return {
        kind: 'done',
        value: await this.insertPartsInTx(
          tx,
          tenantId,
          userId,
          purchaseOf(row),
          parts
        ),
      }
    })
  }

  /**
   * Collapses a purchase back into one row — the sum of its installments,
   * on the purchase day, so on the first installment's bill — only while
   * every installment is Open.
   */
  async collapse(
    tenantId: number,
    userId: number,
    groupId: string,
    today: string
  ): Promise<GroupOutcome<TransactionRow>> {
    return this.ledger.inLedgerTx(async (tx) => {
      const group = await this.lockGroupInTx(tx, tenantId, groupId, today)

      if (group === undefined) {
        return { kind: 'missing' }
      }

      if (!group.allOpen) {
        return { kind: 'billed' }
      }

      for (const row of group.rows) {
        await this.ledger.softDeleteInTx(tx, tenantId, userId, row)
      }

      const [first] = group.rows

      return {
        kind: 'done',
        value: await this.ledger.insertInTx(tx, tenantId, userId, {
          ...purchaseOf(first),
          amount: sumMoney(group.rows.map((row) => row.amount)),
        }),
      }
    })
  }

  /** Inserts one installment per part under one group id. The caller
   * holds the card's lock. */
  private async insertPartsInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[],
    groupId: string = randomUUID()
  ): Promise<TransactionRow[]> {
    const rows: TransactionRow[] = []

    for (const [index, amount] of parts.entries()) {
      rows.push(
        await this.ledger.insertInTx(tx, tenantId, userId, {
          ...purchase,
          amount,
          installment: { groupId, number: index + 1, count: parts.length },
        })
      )
    }

    return rows
  }

  /**
   * Locks a purchase's ACTIVE installments `FOR UPDATE` in id order, then
   * its card, and reads each row's bill close. Nothing when no installment
   * is left.
   */
  private async lockGroupInTx(
    tx: DbOrTx,
    tenantId: number,
    groupId: string,
    today: string
  ): Promise<LockedGroup | undefined> {
    const locked = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.installmentGroupId, groupId),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactions.id))
      .for('update')

    if (locked.length === 0) {
      return undefined
    }

    await lockAccounts(tx, tenantId, [locked[0].linkedAccountId])

    const rows = [...locked].sort(
      (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0)
    )
    const states = await this.statesInTx(tx, tenantId, rows)

    return {
      rows,
      states,
      allOpen: states.every((state) => isOpenInstallment(state, today)),
      today,
    }
  }

  /** Each row with the close of the bill it is on. */
  private async statesInTx(
    tx: DbOrTx,
    tenantId: number,
    rows: readonly Transaction[]
  ): Promise<InstallmentState[]> {
    const ids = rows.flatMap((row) =>
      row.statementId === null ? [] : [row.statementId]
    )
    const bills =
      ids.length === 0
        ? []
        : await tx
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

  /** Soft-deletes a locked group's installments still on an Open bill and
   * answers their ids. */
  private async deleteOpenInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    group: LockedGroup
  ): Promise<number[]> {
    const open = new Set(
      group.states
        .filter((state) => isOpenInstallment(state, group.today))
        .map((state) => state.id)
    )
    const deleted: number[] = []

    for (const row of group.rows) {
      if (open.has(row.id)) {
        await this.ledger.softDeleteInTx(tx, tenantId, userId, row)
        deleted.push(row.id)
      }
    }

    return deleted
  }

  /**
   * Rewrites one installment's shared fields and amount in place, moving
   * the card's balance by the difference and recording the history. Its
   * bill and pin stay. The caller holds the row and card locks.
   */
  private async rewriteInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    before: Transaction,
    change: GroupMeta & { amount: string }
  ): Promise<void> {
    const shift = sumMoney([
      appliedDeltaFor({ ...before, amount: change.amount }),
      negateMoney(appliedDeltaFor(before)),
    ])
    const balanceOnDt = isZeroMoney(shift)
      ? before.balanceOnDt
      : await applyTransactionDelta(tx, tenantId, before.linkedAccountId, shift)

    const [after] = await tx
      .update(transactions)
      .set({
        ...change,
        balanceOnDt,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(
        and(eq(transactions.tenantId, tenantId), eq(transactions.id, before.id))
      )
      .returning()

    await this.ledger.recordHistory(
      tx,
      tenantId,
      before.id,
      userId,
      'UPDATE',
      before,
      after
    )
  }
}

/** The purchase fields of a stored installment (or single row), as the
 * next write of the purchase reuses them. */
function purchaseOf(row: Transaction): PurchaseWrite {
  return {
    name: row.name,
    note: row.note,
    invoice: row.invoice,
    transactionDt: row.transactionDt,
    linkedAccountId: row.linkedAccountId,
    categoryId: row.categoryId,
    receiverId: row.receiverId,
    recurringId: null,
    type: row.type,
    reviewStatus: row.reviewStatus,
    statusNote: row.statusNote,
  }
}
