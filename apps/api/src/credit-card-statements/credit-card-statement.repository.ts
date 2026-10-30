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

export type ReconcileOutcome =
  | { kind: 'reconciled' }
  | { kind: 'mismatch'; total: string }
  | { kind: 'missing' }

export interface StatementPlacement {
  statementId: number | null
  statementPinned: boolean
  closed: boolean
}

export interface PlacementPlan {
  statementId: number | SQL | null
  statementPinned: boolean
  closed: boolean
  batch: LedgerBatchPlan
}

export class CreditCardStatementRepository {
  constructor(
    private readonly db: Database,
    private readonly settings: SettingsRepository,
    private readonly clock: Clock
  ) {}

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

  async todayOf(tenantId: number): Promise<string> {
    const settings = await this.settings.findByTenant(tenantId)

    return todayIn(settings?.timezone ?? 'UTC', this.clock.now())
  }

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

  private stampPlan(statement: LedgerStatement | null): LedgerBatchPlan {
    return new LedgerBatchPlan().addNullable(statement)
  }

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

function col(value: SQL | SQL.Aliased): SQL {
  return sql`${value}`
}

const pendingStatuses: readonly StatementStatus[] = [
  'Open',
  'Closed',
  'PartiallyPaid',
  'Overdue',
]

function hasActivity(run: StatementRun) {
  return or(gt(run.transactionCount, 0), gt(run.paymentCount, 0))
}

function notExistsCharge(tenantId: number, statementId: number): SQL {
  return sql`not exists (
    select 1 from ${transactions}
    where ${transactions.tenantId} = ${tenantId}
      and ${transactions.status} = 'ACTIVE'
      and (${transactions.statementId} = ${statementId}
        or ${transactions.paymentStatementId} = ${statementId})
  )`
}
