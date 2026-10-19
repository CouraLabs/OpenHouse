import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import {
  and,
  asc,
  count,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from 'drizzle-orm'
import type {
  CreditCardStatement,
  Database,
  DbOrTx,
  Transaction,
} from '@workspace/db'
import {
  accounts,
  creditCardStatements,
  transactionHistory,
  transactions,
} from '@workspace/db'
import {
  cardCycleOf,
  compareMoney,
  defaultPaymentStatement,
  resolveStatement,
  todayIn,
  unpaidStatementStatuses,
  type CardCycle,
  type Currency,
  type SearchStatementsArgs,
  type StatementBankFiguresBody,
  type StatementWindow,
} from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import { buildPagedQuery } from '../common/search/fetch.helper.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import {
  assignmentDecision,
  isCardPayment,
  type StatementAssigned,
  type StatementKey,
} from './statement-assignment.js'
import {
  statementTotals,
  statusCondition,
  type StatementRun,
} from './statement-totals.query.js'
import { toStatement, type StatementTotalsRow } from './statement-view.js'

/** What reconciling a bill answered: done, or the bill's own total when
 * the bank's does not match it. */
export type ReconcileOutcome =
  | { kind: 'reconciled' }
  | { kind: 'mismatch'; total: string }
  | { kind: 'missing' }

/** Where a write put a row: its bill, and whether that bill was already
 * closed — the answer the API turns into a `STATEMENT_CLOSED` warning. */
export interface StatementPlacement {
  statementId: number | null
  statementPinned: boolean
  closed: boolean
}

/**
 * The credit card bills, reached only through the tenant of the session.
 * Every method takes the tenant id explicitly.
 *
 * Exported by `CreditCardStatementsModule`: the transactions feature places
 * every card row on its bill through `placeInTx`/`replaceInTx`, inside the
 * ledger transaction that writes the row, after the account is locked.
 */
@Injectable()
export class CreditCardStatementRepository {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  /**
   * Places a new row on the bill its day lands on: nothing off a card, on
   * a card whose days are unset, or for the card side of a payment.
   */
  async placeInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number | null,
    key: StatementKey
  ): Promise<StatementPlacement> {
    if (isCardPayment(key)) {
      return { statementId: null, statementPinned: false, closed: false }
    }

    const cycle = await this.cycleInTx(tx, tenantId, key.linkedAccountId)

    if (cycle === null) {
      return { statementId: null, statementPinned: false, closed: false }
    }

    const window = resolveStatement(cycle, key.transactionDt)
    const statementId = await this.getOrCreateInTx(
      tx,
      tenantId,
      userId,
      key.linkedAccountId,
      window
    )
    const closed = await this.touchInTx(tx, tenantId, statementId, window)

    return { statementId, statementPinned: false, closed }
  }

  /**
   * Re-places an updated row: keeps its bill, or resolves it again from the
   * new key — see `assignmentDecision`.
   */
  async replaceInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number | null,
    before: StatementAssigned,
    after: StatementKey
  ): Promise<StatementPlacement> {
    if (assignmentDecision(before, after) === 'keep') {
      return {
        statementId: before.statementId,
        statementPinned: before.statementPinned,
        closed: false,
      }
    }

    return this.placeInTx(tx, tenantId, userId, after)
  }

  /**
   * Reads one ACTIVE bill of the tenant locked `FOR SHARE` inside a write —
   * the target of a manual move — and answers whether it is closed.
   */
  async findForMoveInTx(
    tx: DbOrTx,
    tenantId: number,
    id: number
  ): Promise<{ statement: CreditCardStatement; closed: boolean } | undefined> {
    const [statement] = await tx
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id),
          eq(creditCardStatements.status, 'ACTIVE')
        )
      )
      .for('share')

    if (statement === undefined) {
      return undefined
    }

    return {
      statement,
      closed: await this.touchInTx(tx, tenantId, id, statement),
    }
  }

  /** Reads one bill of the tenant, ACTIVE or not, without totals. */
  async findById(
    tenantId: number,
    id: number
  ): Promise<CreditCardStatement | undefined> {
    const [row] = await this.db
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id)
        )
      )

    return row
  }

  /**
   * Runs the paged bill search. Bills nothing landed on are left out — a
   * cycle with no charge and no payment is no bill to show. A status filter runs in SQL
   * against the tenant's today.
   */
  async search(
    tenantId: number,
    today: string,
    args: SearchStatementsArgs
  ): Promise<{ rows: StatementTotalsRow[]; total: number }> {
    const { net, run } = statementTotals(
      this.db,
      tenantId,
      args.filter.accountId === undefined
        ? undefined
        : eq(creditCardStatements.accountId, args.filter.accountId)
    )
    const statuses = args.filter.status
    const where = and(
      hasActivity(run),
      statuses === undefined || statuses.length === 0
        ? undefined
        : or(...statuses.map((status) => statusCondition(run, today, status)))
    )
    const query = buildPagedQuery(args, where, {
      dueDate: run.dueDate,
      closeDate: run.closeDate,
      periodStart: run.periodStart,
      total: run.total,
      accountName: accounts.name,
      id: run.id,
    })
    const sortsId = args.sort.some((clause) => clause.field === 'id')

    const [rows, [counted]] = await Promise.all([
      this.db
        .with(net, run)
        .select(this.joinedFields(run))
        .from(run)
        .innerJoin(accounts, eq(accounts.id, run.accountId))
        .where(query.where)
        .orderBy(...query.orderBy, ...(sortsId ? [] : [asc(run.id)]))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .with(net, run)
        .select({ value: count() })
        .from(run)
        .where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Reads one bill of the tenant with its derived totals — the carry-over
   * computed over the whole card. */
  async findTotals(
    tenantId: number,
    id: number,
    db: DbOrTx = this.db
  ): Promise<StatementTotalsRow | undefined> {
    const [statement] = await db
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id)
        )
      )

    if (statement === undefined || statement.status === 'DELETED') {
      return undefined
    }

    const { net, run } = statementTotals(
      db,
      tenantId,
      eq(creditCardStatements.accountId, statement.accountId)
    )

    const [row] = await db
      .with(net, run)
      .select(this.joinedFields(run))
      .from(run)
      .innerJoin(accounts, eq(accounts.id, run.accountId))
      .where(eq(run.id, id))

    return row
  }

  /** Reads every bill of one card with its totals, in close order — the
   * raw material of the card-delete check and the dashboard. */
  async listTotalsByAccount(
    tenantId: number,
    accountId: number
  ): Promise<StatementTotalsRow[]> {
    const { net, run } = statementTotals(
      this.db,
      tenantId,
      eq(creditCardStatements.accountId, accountId)
    )

    return this.db
      .with(net, run)
      .select(this.joinedFields(run))
      .from(run)
      .innerJoin(accounts, eq(accounts.id, run.accountId))
      .where(hasActivity(run))
      .orderBy(asc(run.closeDate))
  }

  /**
   * What a card still owes on its bills: how many closed bills are not paid
   * in full, and the latest bill's amount due — which already carries every
   * earlier remainder. The check a card deletion confirms first.
   */
  async unpaidSummary(
    tenantId: number,
    accountId: number
  ): Promise<{ unpaidBills: number; amountDue: string; currency: Currency }> {
    const today = await this.todayOf(tenantId)
    const bills = (await this.listTotalsByAccount(tenantId, accountId)).map(
      (row) => toStatement(row, today)
    )
    const latest = bills.at(-1)

    return {
      unpaidBills: bills.filter((bill) =>
        unpaidStatementStatuses.includes(bill.status)
      ).length,
      amountDue: latest?.amountDue ?? '0.00',
      currency: latest?.currency ?? 'USD',
    }
  }

  /**
   * The bill a payment into a card settles when the transfer names none:
   * poco's `defaultPaymentStatement` over the card's bills, else the bill
   * today lands on. Nothing for a card whose days are unset.
   */
  async defaultPaymentStatementId(
    tenantId: number,
    userId: number,
    accountId: number
  ): Promise<number | null> {
    const today = await this.todayOf(tenantId)
    const bills = (await this.listTotalsByAccount(tenantId, accountId)).map(
      (row) => toStatement(row, today)
    )

    return (
      defaultPaymentStatement(bills)?.id ??
      (await this.getOrCreateCurrent(tenantId, userId, accountId))
    )
  }

  /**
   * The bill a payment into a card settles when nothing named one and the
   * card has no unpaid or Open bill yet: the one today lands on, opened if
   * need be. Nothing for a card whose days are unset — it has no bills. Runs
   * in a transaction of its own; an empty bill a failed payment leaves
   * behind is hidden like any bill nothing landed on.
   */
  private async getOrCreateCurrent(
    tenantId: number,
    userId: number,
    accountId: number
  ): Promise<number | null> {
    return this.db.transaction(async (tx) => {
      const cycle = await this.cycleInTx(tx, tenantId, accountId)

      if (cycle === null) {
        return null
      }

      const window = resolveStatement(cycle, await this.todayOf(tenantId, tx))

      return this.getOrCreateInTx(tx, tenantId, userId, accountId, window)
    })
  }

  /** Writes the figures typed in from the bank's bill. Answers the row, or
   * nothing when the bill is gone. */
  async updateBankFigures(
    tenantId: number,
    userId: number,
    id: number,
    figures: StatementBankFiguresBody
  ): Promise<CreditCardStatement | undefined> {
    const [row] = await this.db
      .update(creditCardStatements)
      .set({
        minimumDue: figures.minimumDue,
        bankTotal: figures.bankTotal,
        updateBy: userId,
        updateDt: this.clock.now(),
      })
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id),
          eq(creditCardStatements.status, 'ACTIVE')
        )
      )
      .returning()

    return row
  }

  /**
   * Reconciles a bill with the bank's: when the bank's total equals the
   * bill's own, stamps `reconciledAt` (and keeps the bank total) and marks
   * every Verify row on the bill Checked — the other side of a transfer
   * with it, as any status change does — each recorded in the history. No
   * money moves, so no account is locked. The bill's rows are locked `FOR
   * UPDATE` in id order first and the bill after them, the ledger's
   * row-first order, so no edit can change the total between the check and
   * the stamp.
   */
  async reconcile(
    tenantId: number,
    userId: number,
    id: number,
    bankTotal: string
  ): Promise<ReconcileOutcome> {
    return this.db.transaction(async (tx) => {
      const onBill = tx
        .select({ id: transactions.transferGroupId })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            eq(transactions.statementId, id),
            isNotNull(transactions.transferGroupId)
          )
        )
      const rows = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            eq(transactions.status, 'ACTIVE'),
            or(
              eq(transactions.statementId, id),
              inArray(transactions.transferGroupId, onBill)
            )
          )
        )
        .orderBy(asc(transactions.id))
        .for('update')

      const [statement] = await tx
        .select({ id: creditCardStatements.id })
        .from(creditCardStatements)
        .where(
          and(
            eq(creditCardStatements.tenantId, tenantId),
            eq(creditCardStatements.id, id),
            eq(creditCardStatements.status, 'ACTIVE')
          )
        )
        .for('update')

      if (statement === undefined) {
        return { kind: 'missing' as const }
      }

      const totals = await this.findTotals(tenantId, id, tx)

      if (totals === undefined) {
        return { kind: 'missing' as const }
      }

      if (compareMoney(totals.total, bankTotal) !== 0) {
        return { kind: 'mismatch' as const, total: totals.total }
      }

      const now = this.clock.now()
      const verify = rows.filter((row) => row.reviewStatus === 'Verify')

      if (verify.length > 0) {
        const updated = await tx
          .update(transactions)
          .set({ reviewStatus: 'Checked', updateBy: userId, updateDt: now })
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              inArray(
                transactions.id,
                verify.map((row) => row.id)
              )
            )
          )
          .returning()
        const before = new Map(verify.map((row) => [row.id, row]))

        await tx.insert(transactionHistory).values(
          updated.map((after) => ({
            tenantId,
            transactionId: after.id,
            action: 'UPDATE' as const,
            before: before.get(after.id) ?? null,
            after,
            createdBy: userId,
          }))
        )
      }

      await tx
        .update(creditCardStatements)
        .set({ bankTotal, reconciledAt: now, updateBy: userId, updateDt: now })
        .where(
          and(
            eq(creditCardStatements.tenantId, tenantId),
            eq(creditCardStatements.id, id)
          )
        )

      return { kind: 'reconciled' as const }
    })
  }

  /** The tenant's "today", in its own zone — what decides whether a bill
   * is still open. */
  async todayOf(tenantId: number, tx: DbOrTx = this.db): Promise<string> {
    const settings = await this.settings.findByTenant(tenantId, tx)

    return todayIn(settings?.timezone ?? 'UTC', this.clock.now())
  }

  // --- The card-cycle resync (see StatementCycleSyncService) ---

  /**
   * Locks the rows a cycle change may move, `FOR UPDATE` in id order — the
   * ledger's row-first lock order: the card's ACTIVE unpinned charges on an
   * Open bill or on none yet. The card side of a payment never moves.
   */
  async lockResyncCandidatesInTx(
    tx: DbOrTx,
    tenantId: number,
    accountId: number,
    today: string
  ): Promise<Transaction[]> {
    const openIds = tx
      .select({ id: creditCardStatements.id })
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.accountId, accountId),
          eq(creditCardStatements.status, 'ACTIVE'),
          gt(creditCardStatements.closeDate, today)
        )
      )

    return tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          eq(transactions.status, 'ACTIVE'),
          eq(transactions.statementPinned, false),
          sql`not (${transactions.type} = 'Income' and ${transactions.transferGroupId} is not null)`,
          or(
            isNull(transactions.statementId),
            inArray(transactions.statementId, openIds)
          )
        )
      )
      .orderBy(asc(transactions.id))
      .for('update')
  }

  /** Locks the card row, after its transactions and before any bill write. */
  async lockAccountInTx(
    tx: DbOrTx,
    tenantId: number,
    accountId: number
  ): Promise<void> {
    await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, accountId)))
      .for('update')
  }

  /** The card's Open ACTIVE bills, and which of them a resync must keep:
   * those holding pinned charges, or payments — a prepaid bill keeps the
   * payment that settles it. */
  async findOpenInTx(
    tx: DbOrTx,
    tenantId: number,
    accountId: number,
    today: string
  ): Promise<{ open: CreditCardStatement[]; pinnedIds: Set<number> }> {
    const open = await tx
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.accountId, accountId),
          eq(creditCardStatements.status, 'ACTIVE'),
          gt(creditCardStatements.closeDate, today)
        )
      )
      .for('update')

    const pinned =
      open.length === 0
        ? []
        : await tx
            .selectDistinct({ id: transactions.statementId })
            .from(transactions)
            .where(
              and(
                eq(transactions.tenantId, tenantId),
                eq(transactions.status, 'ACTIVE'),
                eq(transactions.statementPinned, true),
                inArray(
                  transactions.statementId,
                  open.map((statement) => statement.id)
                )
              )
            )

    const paid =
      open.length === 0
        ? []
        : await tx
            .selectDistinct({ id: transactions.paymentStatementId })
            .from(transactions)
            .where(
              and(
                eq(transactions.tenantId, tenantId),
                eq(transactions.status, 'ACTIVE'),
                inArray(
                  transactions.paymentStatementId,
                  open.map((statement) => statement.id)
                )
              )
            )

    return {
      open,
      pinnedIds: new Set(
        [...pinned, ...paid].flatMap((row) => (row.id === null ? [] : [row.id]))
      ),
    }
  }

  /** Rewrites an Open bill's period start and due date in place. */
  async updateWindowInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    update: { id: number; periodStart: string; dueDate: string }
  ): Promise<void> {
    await tx
      .update(creditCardStatements)
      .set({
        periodStart: update.periodStart,
        dueDate: update.dueDate,
        updateBy: userId,
        updateDt: this.clock.now(),
      })
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, update.id)
        )
      )
  }

  /**
   * Moves locked rows onto a bill and records an UPDATE history row for
   * each one that actually moved — the resync is a change of the rows,
   * audited like any other.
   */
  async reassignInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    rows: readonly Transaction[],
    statementId: number
  ): Promise<void> {
    const moving = rows.filter((row) => row.statementId !== statementId)

    if (moving.length === 0) {
      return
    }

    const updated = await tx
      .update(transactions)
      .set({ statementId, updateBy: userId, updateDt: this.clock.now() })
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          inArray(
            transactions.id,
            moving.map((row) => row.id)
          )
        )
      )
      .returning()

    const before = new Map(moving.map((row) => [row.id, row]))

    await tx.insert(transactionHistory).values(
      updated.map((after) => ({
        tenantId,
        transactionId: after.id,
        action: 'UPDATE' as const,
        before: before.get(after.id) ?? null,
        after,
        createdBy: userId,
      }))
    )
  }

  /** Soft-deletes Open bills no charge stays on. */
  async softDeleteInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    ids: readonly number[]
  ): Promise<void> {
    if (ids.length === 0) {
      return
    }

    await tx
      .update(creditCardStatements)
      .set({ status: 'DELETED', updateBy: userId, updateDt: this.clock.now() })
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          inArray(creditCardStatements.id, [...ids])
        )
      )
  }

  /**
   * Finds the card's ACTIVE bill for a window's close, or creates it with
   * the window's days snapshotted. `ON CONFLICT DO NOTHING` against the
   * partial unique index makes the claim atomic: a concurrent creator
   * makes this insert wait and then yield, and the follow-up select reads
   * the row it committed. No error is ever caught here — the recurring job
   * catches unique violations around its whole transaction.
   */
  async getOrCreateInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number | null,
    accountId: number,
    window: StatementWindow
  ): Promise<number> {
    const [created] = await tx
      .insert(creditCardStatements)
      .values({
        tenantId,
        accountId,
        periodStart: window.periodStart,
        closeDate: window.closeDate,
        dueDate: window.dueDate,
        createdBy: userId,
        updateBy: userId,
      })
      .onConflictDoNothing({
        target: [
          creditCardStatements.tenantId,
          creditCardStatements.accountId,
          creditCardStatements.closeDate,
        ],
        where: sql`status = 'ACTIVE'`,
      })
      .returning({ id: creditCardStatements.id })

    if (created !== undefined) {
      return created.id
    }

    const [existing] = await tx
      .select({ id: creditCardStatements.id })
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.accountId, accountId),
          eq(creditCardStatements.closeDate, window.closeDate),
          eq(creditCardStatements.status, 'ACTIVE')
        )
      )

    return existing.id
  }

  /** The cycle of an account, or nothing when it is not a card or its days
   * are unset. */
  private async cycleInTx(
    tx: DbOrTx,
    tenantId: number,
    accountId: number
  ): Promise<CardCycle | null> {
    const [account] = await tx
      .select({
        type: accounts.type,
        closeDay: accounts.closeDay,
        dueDay: accounts.dueDay,
        closeDayInclusive: accounts.closeDayInclusive,
      })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, accountId)))

    if (account === undefined || account.type !== 'Credit Card') {
      return null
    }

    return cardCycleOf(account)
  }

  /**
   * Answers whether a bill is past its close in the tenant's zone, stamping
   * `closedAt` the first time a write finds it so — an audit marker only.
   */
  private async touchInTx(
    tx: DbOrTx,
    tenantId: number,
    statementId: number,
    window: Pick<StatementWindow, 'closeDate'>
  ): Promise<boolean> {
    const today = await this.todayOf(tenantId, tx)

    if (window.closeDate > today) {
      return false
    }

    await tx
      .update(creditCardStatements)
      .set({ closedAt: this.clock.now() })
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, statementId),
          isNull(creditCardStatements.closedAt),
          lte(creditCardStatements.closeDate, today)
        )
      )

    return true
  }

  /** The joined select every totals read shares. */
  private joinedFields(run: StatementRun) {
    return {
      id: run.id,
      accountId: run.accountId,
      accountName: accounts.name,
      currency: accounts.currency,
      closeDayInclusive: accounts.closeDayInclusive,
      periodStart: run.periodStart,
      closeDate: run.closeDate,
      dueDate: run.dueDate,
      closedAt: run.closedAt,
      minimumDue: run.minimumDue,
      bankTotal: run.bankTotal,
      reconciledAt: run.reconciledAt,
      transactionCount: run.transactionCount,
      paymentCount: run.paymentCount,
      charges: run.charges,
      credits: run.credits,
      total: run.total,
      paid: run.paid,
      previousBalance: run.previousBalance,
      nextDueDate: run.nextDueDate,
    }
  }
}

/** Whether anything landed on a bill: a charge, or a payment settling it. */
function hasActivity(run: StatementRun) {
  return or(gt(run.transactionCount, 0), gt(run.paymentCount, 0))
}
