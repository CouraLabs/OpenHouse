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
  type SQL,
} from 'drizzle-orm'
import type {
  CreditCardStatement,
  Database,
  DbOrTx,
  Transaction,
} from '@workspace/db'
import {
  accounts,
  centsToDecimalSql,
  creditCardStatements,
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
  type StatementStatus,
  type StatementWindow,
} from '@workspace/poco'

import { Clock } from '../common/clock/clock.js'
import {
  LedgerBatchPlan,
  stampFor,
  type LedgerStatement,
} from '../common/ledger/ledger-batch.js'
import { auditedUpdateStatements } from '../common/ledger/transaction-history.js'
import { buildPagedQuery } from '../common/search/fetch.helper.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import {
  assignmentDecision,
  isCardPayment,
  type StatementAssigned,
  type StatementKey,
} from './statement-assignment.js'
import { planCycleResync } from './cycle-resync.js'
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
 * The bill placement of a write, planned before the write's batch is sent.
 *
 * A bill that already exists is referenced by its known id; one that must
 * be opened inside the batch is referenced through the subselect the
 * get-or-create insert feeds — `ON CONFLICT DO NOTHING` against the partial
 * unique index makes the claim atomic, and a concurrent creator's bill is
 * the one the subselect finds. The `closedAt` audit stamp rides the same
 * batch, guarded to fire once.
 */
export interface PlacementPlan {
  /** The bill the row lands on — a known id, or the in-batch subselect
   * when the bill is opened inside the same batch, or null for no bill. */
  statementId: number | SQL | null
  statementPinned: boolean
  /** Whether the bill the row lands on is already past its close. */
  closed: boolean
  /** The statements the caller's batch must include before the row write
   * that references `statementId` — the get-or-create insert, when one is
   * needed, and the `closedAt` stamp last. */
  batch: LedgerBatchPlan
}

/**
 * The credit card bills, reached only through the tenant of the session.
 * Every method takes the tenant id explicitly.
 *
 * The transactions feature places every card row on its bill through
 * `planPlacement`/`planReplacement` before the ledger batch that writes the
 * row — the statements land in the same batch, so a bill and the charge on
 * it commit together.
 */
export class CreditCardStatementRepository {
  constructor(
    private readonly db: Database,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

  /**
   * Plans where a new row lands: the bill its day resolves to, `offset`
   * cycles later (installment `k` of a purchase lands on offset `k − 1`) —
   * nothing off a card, on a card whose days are unset, or for the card
   * side of a payment.
   */
  async planPlacement(
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    key: StatementKey,
    offset = 0
  ): Promise<PlacementPlan> {
    if (isCardPayment(key)) {
      return {
        statementId: null,
        statementPinned: false,
        closed: false,
        batch: new LedgerBatchPlan(),
      }
    }

    const cycle = await this.cycleOf(db, tenantId, key.linkedAccountId)

    if (cycle === null) {
      return {
        statementId: null,
        statementPinned: false,
        closed: false,
        batch: new LedgerBatchPlan(),
      }
    }

    const window = resolveStatement(cycle, key.transactionDt, offset)

    return this.planGetOrCreate(db, tenantId, userId, key.linkedAccountId, window)
  }

  /**
   * Plans where an updated row lands: it keeps its bill, or resolves it
   * again from the new key — see `assignmentDecision`.
   */
  async planReplacement(
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    before: StatementAssigned,
    after: StatementKey
  ): Promise<PlacementPlan> {
    if (assignmentDecision(before, after) === 'keep') {
      return {
        statementId: before.statementId,
        statementPinned: before.statementPinned,
        closed: false,
        batch: new LedgerBatchPlan(),
      }
    }

    return this.planPlacement(db, tenantId, userId, after)
  }

  /** Reads one ACTIVE bill of the tenant — the target of a manual move —
   * and answers whether it is closed. The caller stamps `closedAt` in its
   * own batch (`closedStamp`). */
  async findForMove(
    db: DbOrTx,
    tenantId: number,
    id: number
  ): Promise<
    | {
        statement: CreditCardStatement
        closed: boolean
        closedStamp: LedgerStatement | null
      }
    | undefined
  > {
    const [statement] = await db
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id),
          eq(creditCardStatements.status, 'ACTIVE')
        )
      )

    if (statement === undefined) {
      return undefined
    }

    const closed = statement.closeDate <= (await this.todayOf(tenantId))

    return {
      statement,
      closed,
      closedStamp: this.closedStampStatement(db, tenantId, id, closed),
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

  /**
   * Reads the bills still asking for money — Open, Closed, PartiallyPaid or
   * Overdue — due on or before `dueBy`, of ACTIVE cards, soonest due first.
   * The carry-over is computed over every bill of each card, never just the
   * ones returned. Bills nothing landed on are left out.
   */
  async listPending(
    tenantId: number,
    today: string,
    dueBy: string
  ): Promise<StatementTotalsRow[]> {
    const { net, run } = statementTotals(this.db, tenantId)

    return this.db
      .with(net, run)
      .select(this.joinedFields(run))
      .from(run)
      .innerJoin(accounts, eq(accounts.id, run.accountId))
      .where(
        and(
          hasActivity(run),
          eq(accounts.status, 'ACTIVE'),
          lte(run.dueDate, dueBy),
          or(
            ...pendingStatuses.map((status) =>
              statusCondition(run, today, status)
            )
          )
        )
      )
      .orderBy(asc(run.dueDate), asc(run.id))
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
   * today lands on, opened if need be. Nothing for a card whose days are
   * unset.
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

    const defaulted = defaultPaymentStatement(bills)?.id

    if (defaulted !== undefined) {
      return defaulted
    }

    return this.getOrCreateCurrent(tenantId, userId, accountId)
  }

  /**
   * The bill a payment into a card settles when nothing named one and the
   * card has no unpaid or Open bill yet: the one today lands on, opened if
   * need be. Nothing for a card whose days are unset — it has no bills. An
   * empty bill a failed payment leaves behind is hidden like any bill
   * nothing landed on.
   */
  private async getOrCreateCurrent(
    tenantId: number,
    userId: number,
    accountId: number
  ): Promise<number | null> {
    const cycle = await this.cycleOf(this.db, tenantId, accountId)

    if (cycle === null) {
      return null
    }

    const window = resolveStatement(cycle, await this.todayOf(tenantId))
    const plan = await this.planGetOrCreate(
      this.db,
      tenantId,
      userId,
      accountId,
      window
    )

    await plan.batch.run(this.db)

    if (typeof plan.statementId === 'number') {
      return plan.statementId
    }

    // The bill was opened inside the batch: the subselect that placed the
    // row is re-run as a plain read now that it is committed.
    const [row] = await this.db
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

    return row?.id ?? null
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
   * money moves, so no account is touched. Every row's check flips through
   * its own guarded update (an optimistic `update_dt` guard, so an edit
   * racing the reconcile answers 409 instead of being overwritten), the
   * histories ride the same statements, and the bill's own stamp is guarded
   * on its update too.
   */
  async reconcile(
    tenantId: number,
    userId: number,
    id: number,
    bankTotal: string
  ): Promise<ReconcileOutcome> {
    const onBill = this.db
      .select({ id: transactions.transferGroupId })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.statementId, id),
          isNotNull(transactions.transferGroupId)
        )
      )
    const rows = await this.db
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

    const [statement] = await this.db
      .select()
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id),
          eq(creditCardStatements.status, 'ACTIVE')
        )
      )

    if (statement === undefined) {
      return { kind: 'missing' as const }
    }

    const totals = await this.findTotals(tenantId, id)

    if (totals === undefined) {
      return { kind: 'missing' as const }
    }

    if (compareMoney(totals.total, bankTotal) !== 0) {
      return { kind: 'mismatch' as const, total: totals.total }
    }

    const now = this.clock.now()
    const plan = new LedgerBatchPlan()

    for (const row of rows.filter((row) => row.reviewStatus === 'Verify')) {
      const stamp = stampFor(row)
      const audited = auditedUpdateStatements(this.db, {
        tenantId,
        id: row.id,
        userId,
        before: row,
        set: { reviewStatus: 'Checked', updateBy: userId, updateDt: stamp },
        action: 'UPDATE',
      })

      plan.guarded(
        audited.update,
        1,
        'the Verify row being checked (optimistic concurrency)'
      )
      plan.add(audited.history)
    }

    plan.guarded(
      this.db
        .update(creditCardStatements)
        .set({ bankTotal, reconciledAt: now, updateBy: userId, updateDt: now })
        .where(
          and(
            eq(creditCardStatements.tenantId, tenantId),
            eq(creditCardStatements.id, id),
            eq(creditCardStatements.updateDt, statement.updateDt)
          )
        ),
      1,
      'the bill being reconciled (optimistic concurrency)'
    )

    await plan.run(this.db)

    return { kind: 'reconciled' as const }
  }

  /** The tenant's "today", in its own zone — what decides whether a bill
   * is still open. */
  async todayOf(tenantId: number): Promise<string> {
    const settings = await this.settings.findByTenant(tenantId)

    return todayIn(settings?.timezone ?? 'UTC', this.clock.now())
  }

  // --- The card-cycle resync (see StatementCycleSyncService) ---

  /**
   * Reads the rows a cycle change may move: the card's ACTIVE unpinned
   * charges on an Open bill or on none yet. The card side of a payment
   * never moves.
   */
  async resyncCandidates(
    db: DbOrTx,
    tenantId: number,
    accountId: number,
    today: string
  ): Promise<Transaction[]> {
    const openIds = db
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

    return db
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
  }

  /** The card's Open ACTIVE bills, and which of them a resync must keep:
   * those holding pinned charges, or payments — a prepaid bill keeps the
   * payment that settles it. */
  async findOpen(
    db: DbOrTx,
    tenantId: number,
    accountId: number,
    today: string
  ): Promise<{ open: CreditCardStatement[]; pinnedIds: Set<number> }> {
    const open = await db
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

    const pinned =
      open.length === 0
        ? []
        : await db
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
        : await db
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

  /**
   * The statements one cycle resync needs, planned from its pre-reads.
   * Each Open bill's window is rewritten under an optimistic guard; each
   * moved row is re-placed under its own guard and recorded in the
   * history; the bills nothing would stay on are soft-deleted guarded by a
   * re-check that nothing landed on them since the read — the guard that
   * replaces the row lock a purchase once held against the resync.
   */
  async planResync(
    tenantId: number,
    userId: number,
    accountId: number,
    cycle: CardCycle,
    today: string
  ): Promise<LedgerBatchPlan> {
    const candidates = await this.resyncCandidates(
      this.db,
      tenantId,
      accountId,
      today
    )
    const { open, pinnedIds } = await this.findOpen(
      this.db,
      tenantId,
      accountId,
      today
    )
    const plan = planCycleResync(cycle, open, candidates, pinnedIds)
    const batch = new LedgerBatchPlan()

    for (const update of plan.windowUpdates) {
      const before = open.find((row) => row.id === update.id)

      batch.guarded(
        this.db
          .update(creditCardStatements)
          .set({
            periodStart: update.periodStart,
            dueDate: update.dueDate,
            updateBy: userId,
            updateDt: stampFor(before),
          })
          .where(
            and(
              eq(creditCardStatements.tenantId, tenantId),
              eq(creditCardStatements.id, update.id),
              ...(before === undefined
                ? []
                : [eq(creditCardStatements.updateDt, before.updateDt)])
            )
          ),
        1,
        'the bill whose window the resync rewrites (optimistic concurrency)'
      )
    }

    const byId = new Map(candidates.map((row) => [row.id, row]))

    for (const group of plan.assignments) {
      // The bill the group moves to, opened inside this batch if need be —
      // the subselect resolves to whichever creator won, ours included.
      const placement = await this.planGetOrCreate(
        this.db,
        tenantId,
        userId,
        accountId,
        group.window
      )

      batch.append(placement.batch)

      for (const row of group.transactionIds.flatMap(
        (id: number) => byId.get(id) ?? []
      )) {
        // A bill the batch opens has no row on it yet: the move always
        // applies. A known bill is skipped when the row already sits on it.
        if (
          typeof placement.statementId === 'number' &&
          row.statementId === placement.statementId
        ) {
          continue
        }

        const stamp = stampFor(row)
        const audited = auditedUpdateStatements(this.db, {
          tenantId,
          id: row.id,
          userId,
          before: row,
          set: {
            statementId: placement.statementId,
            updateBy: userId,
            updateDt: stamp,
          },
          action: 'UPDATE',
        })

        batch.guarded(
          audited.update,
          1,
          'the row the resync re-places (optimistic concurrency)'
        )
        batch.add(audited.history)
      }
    }

    for (const orphanId of plan.orphanIds) {
      // The guard re-checks, inside the delete, that nothing landed on the
      // bill since the read — a purchase racing the resync keeps its bill.
      batch.add(
        this.db
          .update(creditCardStatements)
          .set({ status: 'DELETED', updateBy: userId, updateDt: this.clock.now() })
          .where(
            and(
              eq(creditCardStatements.tenantId, tenantId),
              eq(creditCardStatements.id, orphanId),
              eq(creditCardStatements.status, 'ACTIVE'),
              notExistsCharge(tenantId, orphanId)
            )
          )
      )
    }

    return batch
  }

  /**
   * Finds the card's ACTIVE bill for a window's close, or plans creating it
   * with the window's days snapshotted. `ON CONFLICT DO NOTHING` against
   * the partial unique index makes the claim atomic: the winner's insert
   * returns the row, and the loser's subselect reads the row the winner
   * committed. No error is ever caught here — the recurring job catches
   * unique violations around its whole batch.
   */
  private async planGetOrCreate(
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    accountId: number,
    window: StatementWindow
  ): Promise<PlacementPlan> {
    const [existing] = await db
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

    const today = await this.todayOf(tenantId)
    const closed = window.closeDate <= today

    if (existing !== undefined) {
      return {
        statementId: existing.id,
        statementPinned: false,
        closed,
        batch: this.stampPlan(
          this.closedStampStatement(db, tenantId, existing.id, closed)
        ),
      }
    }

    const statementId = sql<number>`(select ${creditCardStatements.id} from ${creditCardStatements} where ${creditCardStatements.tenantId} = ${tenantId} and ${creditCardStatements.accountId} = ${accountId} and ${creditCardStatements.closeDate} = ${window.closeDate} and ${creditCardStatements.status} = 'ACTIVE')`

    return {
      statementId,
      statementPinned: false,
      closed,
      batch: new LedgerBatchPlan()
        .add(
          db
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
            // No conflict target: DO NOTHING answers any uniqueness
            // conflict, and the partial index's predicate cannot render
            // where drizzle puts the `where` clause.
            .onConflictDoNothing()
        )
        .addNullable(
          this.closedStampSubselectStatement(
            db,
            tenantId,
            accountId,
            window.closeDate,
            closed
          )
        ),
    }
  }

  /** A plan holding one nullable stamp: an open bill contributes none. */
  private stampPlan(statement: LedgerStatement | null): LedgerBatchPlan {
    return new LedgerBatchPlan().addNullable(statement)
  }

  /** Stamps `closedAt` the first time a write finds a known bill past its
   * close — an audit marker only; no statement runs while the bill is open. */
  private closedStampStatement(
    db: DbOrTx,
    tenantId: number,
    id: number,
    closed: boolean
  ): LedgerStatement | null {
    if (!closed) {
      return null
    }

    return db
      .update(creditCardStatements)
      .set({ closedAt: this.clock.now() })
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.id, id),
          isNull(creditCardStatements.closedAt)
        )
      )
  }

  /** The same stamp for a bill referenced by its identifying window — the
   * shape a get-or-create plans. */
  private closedStampSubselectStatement(
    db: DbOrTx,
    tenantId: number,
    accountId: number,
    closeDate: string,
    closed: boolean
  ): LedgerStatement | null {
    if (!closed) {
      return null
    }

    return db
      .update(creditCardStatements)
      .set({ closedAt: this.clock.now() })
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.accountId, accountId),
          eq(creditCardStatements.closeDate, closeDate),
          eq(creditCardStatements.status, 'ACTIVE'),
          isNull(creditCardStatements.closedAt)
        )
      )
  }

  /** The cycle of an account, or nothing when it is not a card or its days
   * are unset. */
  private async cycleOf(
    db: DbOrTx,
    tenantId: number,
    accountId: number
  ): Promise<CardCycle | null> {
    const [account] = await db
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

  /** The joined select every totals read shares — the cents columns of the
   * run CTE formatted into the two-decimal strings the wire carries. */
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
      charges: centsToDecimalSql(col(run.charges)),
      credits: centsToDecimalSql(col(run.credits)),
      total: centsToDecimalSql(col(run.total)),
      paid: centsToDecimalSql(col(run.paid)),
      previousBalance: centsToDecimalSql(col(run.previousBalance)),
      nextDueDate: run.nextDueDate,
    }
  }
}

/** A CTE column as a plain expression — the alias is the column's name in
 * the CTE's output, and formatting reads the value through it. */
function col(value: SQL | SQL.Aliased): SQL {
  return sql`${value}`
}

/** The statuses of a bill that still asks for money. */
const pendingStatuses: readonly StatementStatus[] = [
  'Open',
  'Closed',
  'PartiallyPaid',
  'Overdue',
]

/** Whether anything landed on a bill: a charge, or a payment settling it. */
function hasActivity(run: StatementRun) {
  return or(gt(run.transactionCount, 0), gt(run.paymentCount, 0))
}

/** Whether nothing ACTIVE sits on a bill — as a charge or a payment — the
 * guard the resync's soft delete re-checks inside the batch. */
function notExistsCharge(tenantId: number, statementId: number): SQL {
  return sql`not exists (
    select 1 from ${transactions}
    where ${transactions.tenantId} = ${tenantId}
      and ${transactions.status} = 'ACTIVE'
      and (${transactions.statementId} = ${statementId}
        or ${transactions.paymentStatementId} = ${statementId})
  )`
}
