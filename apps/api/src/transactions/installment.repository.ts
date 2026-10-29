import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Database, DbOrTx, Transaction } from '@workspace/db'
import { creditCardStatements, transactions } from '@workspace/db'
import {
  divideGroupShares,
  formatCents,
  inheritShares,
  isZeroMoney,
  negateMoney,
  sumMoney,
  toCents,
  type SplitShare,
} from '@workspace/poco'

import {
  balanceDeltaStatement,
  balanceSubselect,
  LedgerBatchPlan,
  stampFor,
} from '../common/ledger/ledger-batch.js'
import { auditedUpdateStatements } from '../common/ledger/transaction-history.js'
import {
  isOpenInstallment,
  planGroupEdit,
  type InstallmentState,
} from './installment-plan.js'
import { appliedDeltaFor } from './transaction-ledger.js'
import {
  TransactionRepository,
  type TransactionRow,
  type TransactionWrite,
} from './transaction.repository.js'

/**
 * The fields every installment of a purchase shares. `groupShares` is how
 * the whole purchase is split, defined once: each installment inherits it,
 * divided the same way as the amount.
 */
export type PurchaseWrite = Omit<
  TransactionWrite,
  'amount' | 'installment' | 'splits'
> & { groupShares?: SplitShare[] }

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
  /** A new payer for every installment; left out, the payer is kept. */
  paidByUserId?: number
}

/** A group edit's new split: `shares` is the whole purchase's split, or
 * null to clear it. */
export interface GroupSplitChange {
  shares: SplitShare[] | null
}

/** A purchase's installments, in order, each with its bill's close. */
interface ReadGroup {
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
 * bill placement exactly as a single row's — composed into one batch whose
 * per-row writes carry their optimistic guards, so an edit racing the group
 * answers 409 instead of tangling the books.
 *
 * Every installment applies its delta at purchase time: the bank holds the
 * whole purchase against the limit, so a 10× TV takes its full price off
 * the card balance on the day it is bought. Limits count it the same way:
 * each installment keeps the purchase day.
 */
export class InstallmentRepository {
  constructor(
    private readonly db: Database,
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

    const states = await this.statesOf(this.db, tenantId, rows)

    return {
      rows,
      allOpen: states.every((state) => isOpenInstallment(state, today)),
    }
  }

  /** Writes a purchase as one installment per part, in one batch. */
  async create(
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[]
  ): Promise<TransactionRow[]> {
    return this.insertParts(tenantId, userId, purchase, parts)
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
    today: string,
    splitChange?: GroupSplitChange
  ): Promise<GroupOutcome<TransactionRow[]>> {
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    const [first] = group.rows
    const stored = await this.groupSharesOf(tenantId, group.rows)
    const groupShares =
      splitChange === undefined ? stored : (splitChange.shares ?? undefined)
    const payer = meta.paidByUserId ?? first.paidByUserId
    const plan = planGroupEdit(
      group.states,
      first.installmentCount ?? group.rows.length,
      parts
    )

    if (plan !== 'meta' && !group.allOpen) {
      return { kind: 'billed' }
    }

    if (plan === 'resplit') {
      const plan_ = new LedgerBatchPlan()

      for (const row of group.rows) {
        plan_.append(this.ledger.planSoftDeleteGroup(this.db, tenantId, userId, row))
      }

      plan_.append(
        await this.planParts(
          tenantId,
          userId,
          { ...purchaseOf(first, groupShares), ...meta },
          parts,
          groupId
        )
      )

      await plan_.run(this.db)
    } else {
      // All installments are divided together, so the group's cents add up.
      const amounts =
        plan === 'amounts' ? parts : group.rows.map((row) => row.amount)
      const divided =
        groupShares === undefined
          ? undefined
          : divideGroupShares(groupShares, amounts, payer)

      const writes = new LedgerBatchPlan()

      for (const [index, row] of group.rows.entries()) {
        const amount = amounts[index]

        writes.append(
          this.planRewrite(tenantId, userId, row, {
            ...meta,
            amount,
          })
        )

        // The shares follow the amount, and a new split replaces them.
        if (
          splitChange !== undefined ||
          plan === 'amounts' ||
          amount !== row.amount
        ) {
          writes.append(
            this.ledger.planReplaceSplits(
              this.db,
              tenantId,
              userId,
              row.id,
              divided === undefined ? [] : (divided[index] ?? [])
            )
          )
        }
      }

      await writes.run(this.db)
    }

    return {
      kind: 'done',
      value: await this.ledger.findInstallments(tenantId, groupId),
    }
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
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    if (scope === 'all' && !group.allOpen) {
      return { kind: 'billed' }
    }

    const deleted = await this.deleteOpenRows(tenantId, userId, group)

    return { kind: 'done', value: deleted.length }
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
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    const open = new Set(
      group.states
        .filter((state) => isOpenInstallment(state, group.today))
        .map((state) => state.id)
    )
    const plan = new LedgerBatchPlan()
    const deleted = new Set<number>()

    for (const row of group.rows) {
      if (open.has(row.id)) {
        plan.append(
          this.ledger.planSoftDeleteGroup(this.db, tenantId, userId, row)
        )
        deleted.add(row.id)
      }
    }

    const billed = group.rows.filter(
      (row) => !deleted.has(row.id) && row.reviewStatus !== 'Canceled'
    )

    if (billed.length === 0) {
      await plan.run(this.db)

      return { kind: 'done', value: null }
    }

    const [first] = group.rows
    const refund = await this.ledger.planInsertGroup(this.db, tenantId, userId, {
      ...purchaseOf(first),
      name,
      type: 'Income',
      reviewStatus: 'Verify',
      statusNote: null,
      transactionDt: today,
      amount: sumMoney(billed.map((row) => row.amount)),
    })

    const base = plan.size
    plan.append(refund.plan)

    const results = await plan.run(this.db)

    return {
      kind: 'done',
      value: await this.ledger.readInsertedRow(
        tenantId,
        results,
        base + refund.insertIndex
      ),
    }
  }

  /**
   * Converts a single card expense into installments while its bill is
   * Open: the row is soft-deleted and the purchase recreated in parts, in
   * one batch. The caller checked the row may split.
   */
  async convert(
    tenantId: number,
    userId: number,
    id: number,
    parts: readonly string[],
    today: string
  ): Promise<GroupOutcome<TransactionRow[]>> {
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

    if (row === undefined || row.installmentGroupId !== null) {
      return { kind: 'missing' }
    }

    const [state] = await this.statesOf(this.db, tenantId, [row])

    if (!isOpenInstallment(state, today)) {
      return { kind: 'billed' }
    }

    const shares = await this.groupSharesOf(tenantId, [row])

    const groupId = randomUUID()
    const plan = new LedgerBatchPlan()
    plan.append(this.ledger.planSoftDeleteGroup(this.db, tenantId, userId, row))
    plan.append(
      await this.planParts(
        tenantId,
        userId,
        purchaseOf(row, shares),
        parts,
        groupId
      )
    )

    await plan.run(this.db)

    return {
      kind: 'done',
      value: await this.ledger.findInstallments(tenantId, groupId),
    }
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
    const group = await this.readGroup(tenantId, groupId, today)

    if (group === undefined) {
      return { kind: 'missing' }
    }

    if (!group.allOpen) {
      return { kind: 'billed' }
    }

    const shares = await this.groupSharesOf(tenantId, group.rows)

    const plan = new LedgerBatchPlan()

    for (const row of group.rows) {
      plan.append(this.ledger.planSoftDeleteGroup(this.db, tenantId, userId, row))
    }

    const [first] = group.rows
    const { groupShares, ...purchase } = purchaseOf(first, shares)
    const amount = sumMoney(group.rows.map((row) => row.amount))

    const collapsed = await this.ledger.planInsertGroup(this.db, tenantId, userId, {
      ...purchase,
      amount,
      ...(groupShares === undefined
        ? {}
        : {
            splits: inheritShares(
              groupShares,
              amount,
              purchase.paidByUserId ?? null
            ),
          }),
    })

    const base = plan.size
    plan.append(collapsed.plan)

    const results = await plan.run(this.db)

    return {
      kind: 'done',
      value: await this.ledger.readInsertedRow(
        tenantId,
        results,
        base + collapsed.insertIndex
      ),
    }
  }

  /** Inserts one installment per part under one group id — one batch, the
   * parts' ledger groups appended in money order. */
  private async insertParts(
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[],
    groupId: string = randomUUID()
  ): Promise<TransactionRow[]> {
    const plan = await this.planParts(tenantId, userId, purchase, parts, groupId)

    await plan.run(this.db)

    return this.ledger.findInstallments(tenantId, groupId)
  }

  /** The plan a purchase's parts make: every part's ledger insert group,
   * the shares divided across the whole group so no member's cents drift. */
  private async planParts(
    tenantId: number,
    userId: number,
    purchase: PurchaseWrite,
    parts: readonly string[],
    groupId: string = randomUUID()
  ): Promise<LedgerBatchPlan> {
    const plan = new LedgerBatchPlan()

    const { groupShares, ...columns } = purchase
    // Every installment inherits the purchase's split, divided across the
    // whole group so no member's cents drift; each installment's shares add
    // up to its own amount.
    const divided =
      groupShares === undefined
        ? undefined
        : divideGroupShares(groupShares, parts, columns.paidByUserId ?? null)

    for (const [index, amount] of parts.entries()) {
      const group = await this.ledger.planInsertGroup(this.db, tenantId, userId, {
        ...columns,
        amount,
        ...(divided === undefined ? {} : { splits: divided[index] }),
        installment: { groupId, number: index + 1, count: parts.length },
      })

      plan.append(group.plan)
    }

    return plan
  }

  /**
   * Reads a purchase's ACTIVE installments in id order, each with its
   * bill's close. Nothing when no installment is left. The rows the write
   * touches are guarded optimistically — a row edited since the read fails
   * the batch.
   */
  private async readGroup(
    tenantId: number,
    groupId: string,
    today: string
  ): Promise<ReadGroup | undefined> {
    const locked = await this.db
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

    if (locked.length === 0) {
      return undefined
    }

    const rows = [...locked].sort(
      (a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0)
    )
    const states = await this.statesOf(this.db, tenantId, rows)

    return {
      rows,
      states,
      allOpen: states.every((state) => isOpenInstallment(state, today)),
      today,
    }
  }

  /** The split of the whole purchase: every member's shares summed over the
   * given rows. Nothing for an unsplit purchase. */
  private async groupSharesOf(
    tenantId: number,
    rows: readonly Transaction[]
  ): Promise<SplitShare[] | undefined> {
    const totals = new Map<number, bigint>()

    for (const row of rows) {
      for (const entry of await this.ledger.sharesOfInTx(
        this.db,
        tenantId,
        row.id
      )) {
        totals.set(
          entry.userId,
          (totals.get(entry.userId) ?? 0n) + toCents(entry.share)
        )
      }
    }

    return totals.size === 0
      ? undefined
      : [...totals]
          .sort(([a], [b]) => a - b)
          .map(([userId, cents]) => ({ userId, share: formatCents(cents) }))
  }

  /** Each row with the close of the bill it is on. */
  private async statesOf(
    db: DbOrTx,
    tenantId: number,
    rows: readonly Transaction[]
  ): Promise<InstallmentState[]> {
    const ids = rows.flatMap((row) =>
      row.statementId === null ? [] : [row.statementId]
    )
    const bills =
      ids.length === 0
        ? []
        : await db
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

  /** Soft-deletes a read group's installments still on an Open bill and
   * answers their ids. */
  private async deleteOpenRows(
    tenantId: number,
    userId: number,
    group: ReadGroup
  ): Promise<number[]> {
    const open = new Set(
      group.states
        .filter((state) => isOpenInstallment(state, group.today))
        .map((state) => state.id)
    )
    const plan = new LedgerBatchPlan()
    const deleted: number[] = []

    for (const row of group.rows) {
      if (open.has(row.id)) {
        plan.append(this.ledger.planSoftDeleteGroup(this.db, tenantId, userId, row))
        deleted.push(row.id)
      }
    }

    await plan.run(this.db)

    return deleted
  }

  /**
   * Rewrites one installment's shared fields and amount in place, moving
   * the card's balance by the difference and recording the history. Its
   * bill and pin stay.
   */
  private planRewrite(
    tenantId: number,
    userId: number,
    before: Transaction,
    change: GroupMeta & { amount: string }
  ): LedgerBatchPlan {
    const plan = new LedgerBatchPlan()
    const shift = sumMoney([
      appliedDeltaFor({ ...before, amount: change.amount }),
      negateMoney(appliedDeltaFor(before)),
    ])
    const stamp = stampFor(before)

    if (!isZeroMoney(shift)) {
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
        balanceOnDt: isZeroMoney(shift)
          ? before.balanceOnDt
          : balanceSubselect(before.linkedAccountId),
        updateBy: userId,
        updateDt: stamp,
      },
      action: 'UPDATE',
    })

    plan.guarded(audited.update, 1, 'the installment row (optimistic concurrency)')
    plan.add(audited.history)

    return plan
  }
}

/** The purchase fields of a stored installment (or single row), as the
 * next write of the purchase reuses them. */
function purchaseOf(
  row: Transaction,
  groupShares?: SplitShare[]
): PurchaseWrite {
  return {
    ...(groupShares === undefined ? {} : { groupShares }),
    paidByUserId: row.paidByUserId,
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
