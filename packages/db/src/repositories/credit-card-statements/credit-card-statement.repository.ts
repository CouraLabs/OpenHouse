import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import type {
  AccountType,
  Currency,
  StatementBankFiguresBody,
  StatementWindow,
} from '@workspace/domain'
import type { Database, DbOrTx } from '../../database.js'
import {
  LedgerBatchPlan,
  stampFor,
  type LedgerStatement,
} from '../../ledger/ledger-batch.js'
import { auditedUpdateStatements } from '../../ledger/transaction-history.js'
import { centsToDecimalSql } from '../../money-sql.js'
import {
  statementTotals,
  type StatementRun,
} from '../../query/statement-totals.query.js'
import {
  accounts,
  creditCardStatements,
  transactions,
  type CreditCardStatement,
  type Transaction,
} from '../../schema.js'

export interface StatementClock {
  now(): Date
}

export interface StatementTotalsRow {
  id: number
  accountId: number
  accountName: string
  currency: Currency
  closeDayInclusive: boolean
  periodStart: string
  closeDate: string
  dueDate: string
  closedAt: Date | null
  minimumDue: string | null
  bankTotal: string | null
  reconciledAt: Date | null
  transactionCount: number
  paymentCount: number
  charges: string
  credits: string
  total: string
  paid: string
  previousBalance: string
  nextDueDate: string | null
}

export interface CardColumns {
  type: AccountType
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
}

export type StatementTarget =
  | { kind: 'none' }
  | { kind: 'keep'; statementId: number | null; statementPinned: boolean }
  | {
      kind: 'bill'
      accountId: number
      window: StatementWindow
      closed: boolean
      pinned: boolean
    }

export interface ResyncWrites {
  windowUpdates: Array<{ id: number; periodStart: string; dueDate: string }>
  assignments: Array<{
    window: StatementWindow
    closed: boolean
    transactionIds: number[]
  }>
  orphanIds: number[]
}

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
    private readonly clock: StatementClock
  ) {}

  async planTarget(
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    target: StatementTarget
  ): Promise<PlacementPlan> {
    switch (target.kind) {
      case 'none':
        return {
          statementId: null,
          statementPinned: false,
          closed: false,
          batch: new LedgerBatchPlan(),
        }
      case 'keep':
        return {
          statementId: target.statementId,
          statementPinned: target.statementPinned,
          closed: false,
          batch: new LedgerBatchPlan(),
        }
      case 'bill': {
        const placement = await this.planGetOrCreate(
          db,
          tenantId,
          userId,
          target.accountId,
          target.window,
          target.closed
        )

        return { ...placement, statementPinned: target.pinned }
      }
      default: {
        const exhaustive: never = target
        throw new Error(`Unhandled target: ${String(exhaustive)}`)
      }
    }
  }

  async findActive(
    tenantId: number,
    id: number
  ): Promise<CreditCardStatement | undefined> {
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

    return statement
  }

  closedStamp(db: DbOrTx, tenantId: number, id: number): LedgerStatement {
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

  async findCard(
    tenantId: number,
    accountId: number
  ): Promise<CardColumns | undefined> {
    const [account] = await this.db
      .select({
        type: accounts.type,
        closeDay: accounts.closeDay,
        dueDay: accounts.dueDay,
        closeDayInclusive: accounts.closeDayInclusive,
      })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, accountId)))

    return account
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

  async listTotals(
    tenantId: number,
    scope: { accountId?: number; activeAccountsOnly?: boolean } = {}
  ): Promise<StatementTotalsRow[]> {
    const { net, run } = statementTotals(
      this.db,
      tenantId,
      scope.accountId === undefined
        ? undefined
        : eq(creditCardStatements.accountId, scope.accountId)
    )

    return this.db
      .with(net, run)
      .select(this.joinedFields(run))
      .from(run)
      .innerJoin(accounts, eq(accounts.id, run.accountId))
      .where(
        scope.activeAccountsOnly === true
          ? eq(accounts.status, 'ACTIVE')
          : undefined
      )
      .orderBy(asc(run.id))
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

  async ensureBill(
    tenantId: number,
    userId: number,
    target: Extract<StatementTarget, { kind: 'bill' }>
  ): Promise<number | undefined> {
    const placement = await this.planGetOrCreate(
      this.db,
      tenantId,
      userId,
      target.accountId,
      target.window,
      target.closed
    )

    await placement.batch.run(this.db)

    return typeof placement.statementId === 'number'
      ? placement.statementId
      : this.findIdByCloseDate(tenantId, target.accountId, target.window.closeDate)
  }

  async findIdByCloseDate(
    tenantId: number,
    accountId: number,
    closeDate: string
  ): Promise<number | undefined> {
    const [row] = await this.db
      .select({ id: creditCardStatements.id })
      .from(creditCardStatements)
      .where(
        and(
          eq(creditCardStatements.tenantId, tenantId),
          eq(creditCardStatements.accountId, accountId),
          eq(creditCardStatements.closeDate, closeDate),
          eq(creditCardStatements.status, 'ACTIVE')
        )
      )

    return row?.id
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

  async listBillRows(tenantId: number, id: number): Promise<Transaction[]> {
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

    return this.db
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
  }

  async markReconciled(
    tenantId: number,
    userId: number,
    statement: CreditCardStatement,
    rowsToCheck: readonly Transaction[],
    bankTotal: string
  ): Promise<void> {
    const now = this.clock.now()
    const plan = new LedgerBatchPlan()

    for (const row of rowsToCheck) {
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
            eq(creditCardStatements.id, statement.id),
            eq(creditCardStatements.updateDt, statement.updateDt)
          )
        ),
      1,
      'the bill being reconciled (optimistic concurrency)'
    )

    await plan.run(this.db)
  }

  async runPlan(plan: LedgerBatchPlan): Promise<void> {
    await plan.run(this.db)
  }

  async resyncCandidates(
    tenantId: number,
    accountId: number,
    today: string
  ): Promise<Transaction[]> {
    const db = this.db
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
    tenantId: number,
    accountId: number,
    today: string
  ): Promise<{ open: CreditCardStatement[]; pinnedIds: Set<number> }> {
    const db = this.db
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

  async planResyncWrites(
    tenantId: number,
    userId: number,
    accountId: number,
    plan: ResyncWrites,
    open: readonly CreditCardStatement[],
    candidates: readonly Transaction[]
  ): Promise<LedgerBatchPlan> {
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
        group.window,
        group.closed
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
          .set({
            status: 'DELETED',
            updateBy: userId,
            updateDt: this.clock.now(),
          })
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
    window: StatementWindow,
    closed: boolean
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

    if (existing !== undefined) {
      return {
        statementId: existing.id,
        statementPinned: false,
        closed,
        batch: closed
          ? new LedgerBatchPlan().add(this.closedStamp(db, tenantId, existing.id))
          : new LedgerBatchPlan(),
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

function notExistsCharge(tenantId: number, statementId: number): SQL {
  return sql`not exists (
    select 1 from ${transactions}
    where ${transactions.tenantId} = ${tenantId}
      and ${transactions.status} = 'ACTIVE'
      and (${transactions.statementId} = ${statementId}
        or ${transactions.paymentStatementId} = ${statementId})
  )`
}
