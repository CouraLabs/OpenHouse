
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import {
  toCents,
  type AccountType,
  type Currency,
  type ForecastRule,
  type SearchTransactionsArgs,
  type SplitShare,
  type StatementWarning,
  type TransactionBreakdownArgs,
  type TransactionFilter,
  type TransactionSplitShare,
  type TransactionStatus,
  type TransactionType,
} from '@workspace/domain'
import type { Database, DbOrTx } from '../../database.js'
import { isAnyUniqueViolation } from '../../errors.js'
import {
  balanceDeltaStatement,
  balanceSubselect,
  LedgerBatchPlan,
  stampFor,
  type LedgerStatement,
} from '../../ledger/ledger-batch.js'
import {
  auditedUpdateStatements,
  createdRowHistoryStatement,
  historyStatement,
} from '../../ledger/transaction-history.js'
import { centsToDecimalSql } from '../../money-sql.js'
import { buildPagedQuery } from '../../query/paged-query.js'
import {
  accounts,
  categories,
  creditCardStatements,
  receivers,
  recurringTransactions,
  tenantSettings,
  transactionHistory,
  transactionSplits,
  transactions,
  users,
  type Transaction,
  type TransactionHistoryRow,
} from '../../schema.js'
import type { BalanceRepository } from '../balances/balance.repository.js'
import type {
  CreditCardStatementRepository,
  StatementTarget,
} from '../credit-card-statements/credit-card-statement.repository.js'

export type TransactionRow = Transaction & {
  accountName: string
  accountType: AccountType
  accountCloseDay: number | null
  accountDueDay: number | null
  accountCloseDayInclusive: boolean
  categoryName: string
  categoryColor: string
  receiverName: string | null
  paidByName: string | null
  splits: TransactionSplitShare[]
  currency: Currency
  statementCloseDate: string | null
  statementDueDate: string | null
  paymentStatementDueDate: string | null
  runningBalance: string
  accountReconciledThrough: string | null
  warning?: StatementWarning
}

export interface TransactionSearch {
  rows: TransactionRow[]
  total: number
}

export interface TransactionWrite {
  name: string
  note: string | null
  invoice: string | null
  amount: string
  transactionDt: string
  linkedAccountId: number
  categoryId: number
  receiverId: number | null
  recurringId: number | null
  type: TransactionType
  reviewStatus: TransactionStatus
  statusNote: string | null
  isAdjustment?: boolean
  paidByUserId?: number | null
  isSettlement?: boolean
  splits?: SplitShare[]
  transferGroupId?: string
  paymentStatementId?: number
  installment?: {
    groupId: string
    number: number
    count: number
    billOffset?: number
  }
  externalId?: string
  importBatchId?: string
}

export type TransactionColumns = Omit<
  TransactionWrite,
  'splits' | 'installment' | 'paidByUserId'
> & { paidByUserId: number | null }

export interface PlannedTransaction {
  columns: TransactionColumns
  installment?: { groupId: string; number: number; count: number }
  target: StatementTarget
  delta: string
  shares: SplitShare[]
}

export interface PlannedSibling {
  row: Transaction
  shift: string
  target: StatementTarget
  set: Pick<
    TransactionWrite,
    | 'amount'
    | 'transactionDt'
    | 'categoryId'
    | 'note'
    | 'reviewStatus'
    | 'statusNote'
  >
}

export interface PlannedUpdate {
  columns: Omit<TransactionWrite, 'splits' | 'installment'>
  target: StatementTarget
  revert: string
  apply: string
  splits?: SplitShare[]
  sibling?: PlannedSibling
}

export interface PlannedDelete {
  row: Transaction
  revert: string
}

export interface PlannedStatusFlip {
  row: Transaction
  reviewStatus: TransactionStatus
  shift: string
}

export interface SplitDefaultsInputs {
  unsplitMode: string | null
  ownership: string | null
  memberIds: number[]
}

const paymentStatements = alias(creditCardStatements, 'payment_statement')

const payers = alias(users, 'payer')

export class TransactionRepository {
  constructor(
    private readonly db: Database,
    private readonly statements: CreditCardStatementRepository,
    private readonly balances: BalanceRepository
  ) {}

  async insert(
    tenantId: number,
    userId: number,
    planned: PlannedTransaction
  ): Promise<TransactionRow> {
    const group = await this.planInsert(tenantId, userId, planned)
    const results = await group.plan.run(this.db)

    return this.readInsertedRow(tenantId, results, group.insertIndex)
  }

  async readInsertedRow(
    tenantId: number,
    results: unknown[],
    insertIndex: number
  ): Promise<TransactionRow> {
    const rows = results[insertIndex] as Array<Record<string, unknown>>
    const id = rows[0].id as number

    return (await this.findById(tenantId, id)) as TransactionRow
  }

  async insertGenerated(
    tenantId: number,
    planned: PlannedTransaction
  ): Promise<TransactionRow | undefined> {
    const group = await this.planInsert(tenantId, null, planned)

    try {
      const results = await group.plan.run(this.db)

      return await this.readInsertedRow(tenantId, results, group.insertIndex)
    } catch (error) {
      if (isAnyUniqueViolation(error)) {
        return undefined
      }

      throw error
    }
  }

  async planInsert(
    tenantId: number,
    userId: number | null,
    planned: PlannedTransaction
  ): Promise<{ plan: LedgerBatchPlan; insertIndex: number }> {
    const db = this.db
    const { columns, installment, shares } = planned
    const placement = await this.statements.planTarget(
      db,
      tenantId,
      userId,
      planned.target
    )
    const stamp = new Date()
    const plan = new LedgerBatchPlan()

    plan.append(placement.batch)
    plan.guarded(
      balanceDeltaStatement(db, tenantId, columns.linkedAccountId, planned.delta),
      1,
      'the account the row moves (exists and is ACTIVE)'
    )

    const row = db
      .insert(transactions)
      .values({
        tenantId,
        createdBy: userId,
        createdDt: stamp,
        updateBy: userId,
        updateDt: stamp,
        ...columns,
        balanceOnDt: balanceSubselect(columns.linkedAccountId),
        statementId: placement.statementId,
        statementPinned: placement.statementPinned,
        ...(installment === undefined
          ? {}
          : {
              installmentGroupId: installment.groupId,
              installmentNumber: installment.number,
              installmentCount: installment.count,
            }),
      })
      .returning()

    const insertIndex = plan.size

    plan.add(row)
    plan.add(createdRowHistoryStatement(db, { tenantId, userId, stamp }))

    if (shares.length > 0) {
      plan.append(this.planSplitsInsert(db, tenantId, userId, shares))
    }

    return { plan, insertIndex }
  }

  async update(
    tenantId: number,
    userId: number,
    before: Transaction,
    planned: PlannedUpdate
  ): Promise<TransactionRow | undefined> {
    const placement = await this.statements.planTarget(
      this.db,
      tenantId,
      userId,
      planned.target
    )
    const plan = new LedgerBatchPlan()

    plan.append(placement.batch)
    this.appendDelta(
      plan,
      tenantId,
      before.linkedAccountId,
      planned.revert,
      'the account the row reverts from (exists and is ACTIVE)'
    )
    this.appendDelta(
      plan,
      tenantId,
      planned.columns.linkedAccountId,
      planned.apply,
      'the account the row applies to (exists and is ACTIVE)'
    )
    plan.append(
      this.planRowUpdate(this.db, tenantId, userId, before, {
        ...planned.columns,
        balanceOnDt: balanceSubselect(planned.columns.linkedAccountId),
        statementId: placement.statementId,
        statementPinned: placement.statementPinned,
      })
    )

    if (planned.splits !== undefined) {
      plan.append(
        this.planReplaceSplits(
          tenantId,
          userId,
          before.id,
          planned.splits
        )
      )
    }

    if (planned.sibling !== undefined) {
      plan.append(
        await this.planSiblingUpdate(tenantId, userId, planned.sibling)
      )
    }

    await plan.run(this.db)

    return this.findById(tenantId, before.id)
  }

  async moveToStatement(
    tenantId: number,
    userId: number,
    row: Transaction,
    set:
      | { paymentStatementId: number }
      | { statementId: number; statementPinned: true },
    closedStatementId: number | null
  ): Promise<TransactionRow> {
    const plan = new LedgerBatchPlan()

    if (closedStatementId !== null) {
      plan.add(this.statements.closedStamp(this.db, tenantId, closedStatementId))
    }

    plan.append(this.planRowUpdate(this.db, tenantId, userId, row, set))

    await plan.run(this.db)

    return (await this.findById(tenantId, row.id)) as TransactionRow
  }

  async updateStatuses(
    tenantId: number,
    userId: number,
    flips: readonly PlannedStatusFlip[]
  ): Promise<void> {
    const plan = new LedgerBatchPlan()

    for (const flip of flips) {
      this.appendDelta(
        plan,
        tenantId,
        flip.row.linkedAccountId,
        flip.shift,
        'the account the status flip moves (exists and is ACTIVE)'
      )
      plan.append(
        this.planRowUpdate(this.db, tenantId, userId, flip.row, {
          reviewStatus: flip.reviewStatus,
        })
      )
    }

    await plan.run(this.db)
  }

  async softDelete(
    tenantId: number,
    userId: number,
    deletes: readonly PlannedDelete[]
  ): Promise<void> {
    const plan = new LedgerBatchPlan()

    for (const entry of deletes) {
      plan.append(this.planSoftDelete(tenantId, userId, entry.row, entry.revert))
    }

    await plan.run(this.db)
  }

  async insertTransfer(
    tenantId: number,
    userId: number,
    legs: readonly [PlannedTransaction, PlannedTransaction],
    closedStatementId: number | null
  ): Promise<[TransactionRow, TransactionRow] | undefined> {
    const transferGroupId = legs[0].columns.transferGroupId

    if (transferGroupId === undefined) {
      throw new Error('A transfer leg needs a transfer group id.')
    }

    const plan = new LedgerBatchPlan()

    if (closedStatementId !== null) {
      plan.add(this.statements.closedStamp(this.db, tenantId, closedStatementId))
    }

    for (const leg of legs) {
      plan.append((await this.planInsert(tenantId, userId, leg)).plan)
    }

    await plan.run(this.db)

    const inserted = await this.findByTransferGroup(tenantId, transferGroupId)

    return inserted as [TransactionRow, TransactionRow] | undefined
  }

  async run(plan: LedgerBatchPlan): Promise<unknown[]> {
    return plan.run(this.db)
  }

  async splitDefaultsOf(
    tenantId: number,
    accountId: number
  ): Promise<SplitDefaultsInputs> {
    const [[settings], [account], members] = await Promise.all([
      this.db
        .select({ unsplitMode: tenantSettings.unsplitMode })
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId)),
      this.db
        .select({ ownership: accounts.ownership })
        .from(accounts)
        .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, accountId))),
      this.db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
        .orderBy(asc(users.id)),
    ])

    return {
      unsplitMode: settings?.unsplitMode ?? null,
      ownership: account?.ownership ?? null,
      memberIds: members.map((member) => member.id),
    }
  }

  async search(
    tenantId: number,
    args: SearchTransactionsArgs
  ): Promise<TransactionSearch> {
    const query = buildPagedQuery(
      args,
      this.filterToSql(tenantId, args.filter),
      {
        transactionDt: transactions.transactionDt,
        amount: transactions.amount,
        name: transactions.name,
        reviewStatus: transactions.reviewStatus,
        type: transactions.type,
        categoryName: categories.name,
        accountName: accounts.name,
        createdDt: transactions.createdDt,
        updateDt: transactions.updateDt,
        id: transactions.id,
      }
    )

    const sortsId = args.sort.some((clause) => clause.field === 'id')

    const running = this.balances.runningBalanceCte(
      this.db,
      tenantId,
      args.filter.linkedAccountId
    )

    const [rows, [counted]] = await Promise.all([
      this.db
        .with(running)
        .select(
          this.joinedColumns(
            this.balances.formatRunningBalance(col(running.cents))
          )
        )
        .from(transactions)
        .innerJoin(running, eq(running.id, transactions.id))
        .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(receivers, eq(transactions.receiverId, receivers.id))
        .leftJoin(payers, eq(transactions.paidByUserId, payers.id))
        .leftJoin(
          creditCardStatements,
          eq(transactions.statementId, creditCardStatements.id)
        )
        .leftJoin(
          paymentStatements,
          eq(transactions.paymentStatementId, paymentStatements.id)
        )
        .where(query.where)
        .orderBy(...query.orderBy, ...(sortsId ? [] : [asc(transactions.id)]))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(receivers, eq(transactions.receiverId, receivers.id))
        .leftJoin(
          creditCardStatements,
          eq(transactions.statementId, creditCardStatements.id)
        )
        .where(query.where),
    ])

    return {
      rows: await this.withSplits(this.db, tenantId, rows),
      total: counted.value,
    }
  }

  async findById(
    tenantId: number,
    id: number
  ): Promise<TransactionRow | undefined> {
    return this.findByIdInTx(this.db, tenantId, id)
  }

  async summary(tenantId: number, filter: TransactionFilter) {
    const rows = await this.db
      .select({
        currency: accounts.currency,
        incomes: centsToDecimalSql(
          sql`coalesce(sum(case when ${transactions.type} = 'Income' then ${transactions.amount} else 0 end), 0)`
        ),
        expenses: centsToDecimalSql(
          sql`coalesce(sum(case when ${transactions.type} = 'Expense' then ${transactions.amount} else 0 end), 0)`
        ),
        creditExpenses: centsToDecimalSql(
          sql`coalesce(sum(case when ${transactions.type} = 'Expense' and ${accounts.type} = 'Credit Card' then ${transactions.amount} else 0 end), 0)`
        ),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .leftJoin(
        creditCardStatements,
        eq(transactions.statementId, creditCardStatements.id)
      )
      .where(
        and(
          this.filterToSql(tenantId, filter),
          isNull(transactions.transferGroupId),
          ne(transactions.reviewStatus, 'Canceled'),
          eq(transactions.isAdjustment, false),
          eq(transactions.isSettlement, false)
        )
      )
      .groupBy(accounts.currency)

    return rows
  }

  async breakdown(
    tenantId: number,
    dimension: TransactionBreakdownArgs['dimension'],
    filter: TransactionFilter
  ) {
    const nameColumn =
      dimension === 'category' ? categories.name : accounts.name
    const colorColumn = dimension === 'category' ? categories.color : undefined

    const totals = this.db
      .select({
        name: sql<string>`coalesce(${nameColumn}, '')`,
        color:
          colorColumn === undefined
            ? sql<null>`null`
            : sql<string | null>`coalesce(${colorColumn}, null)`,
        currency: accounts.currency,
        total: centsToDecimalSql(sql`coalesce(sum(${transactions.amount}), 0)`),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(
        creditCardStatements,
        eq(transactions.statementId, creditCardStatements.id)
      )
      .where(
        and(
          this.filterToSql(tenantId, filter),
          eq(transactions.type, 'Expense'),
          isNull(transactions.transferGroupId),
          ne(transactions.reviewStatus, 'Canceled'),
          eq(transactions.isAdjustment, false),
          eq(transactions.isSettlement, false)
        )
      )
      .groupBy(
        accounts.currency,
        nameColumn,
        ...(colorColumn === undefined ? [] : [colorColumn]),
        categories.status
      )
      .having(
        or(
          ne(categories.status, 'DELETED'),
          sql`coalesce(sum(${transactions.amount}), 0) <> 0`
        )
      )

    return totals
  }

  async expenseTotalsByCategory(
    tenantId: number,
    from: string,
    to: string
  ): Promise<
    Array<{
      categoryId: number
      currency: Currency
      total: string
      count: number
    }>
  > {
    return this.db
      .select({
        categoryId: transactions.categoryId,
        currency: accounts.currency,
        total: centsToDecimalSql(sql`coalesce(sum(${transactions.amount}), 0)`),
        count: count(),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.status, 'ACTIVE'),
          eq(transactions.type, 'Expense'),
          gte(transactions.transactionDt, from),
          lte(transactions.transactionDt, to),
          isNull(transactions.transferGroupId),
          ne(transactions.reviewStatus, 'Canceled'),
          eq(transactions.isAdjustment, false),
          eq(transactions.isSettlement, false)
        )
      )
      .groupBy(transactions.categoryId, accounts.currency)
  }

  async findHistory(
    tenantId: number,
    transactionId: number,
    { skip = 0, limit = 50 }: { skip?: number; limit?: number } = {}
  ): Promise<TransactionHistoryRow[]> {
    return this.db
      .select()
      .from(transactionHistory)
      .where(
        and(
          eq(transactionHistory.tenantId, tenantId),
          eq(transactionHistory.transactionId, transactionId)
        )
      )
      .orderBy(desc(transactionHistory.id))
      .limit(limit)
      .offset(skip)
  }

  async findByRecurringAndDate(
    tenantId: number,
    recurringId: number,
    transactionDt: string
  ): Promise<Transaction | undefined> {
    const [row] = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.recurringId, recurringId),
          eq(transactions.transactionDt, transactionDt),
          eq(transactions.status, 'ACTIVE')
        )
      )

    return row
  }

  async recurringIdsOn(tenantId: number, day: string): Promise<Set<number>> {
    const rows = await this.db
      .selectDistinct({ recurringId: transactions.recurringId })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.transactionDt, day),
          eq(transactions.status, 'ACTIVE'),
          isNotNull(transactions.recurringId)
        )
      )

    return new Set(
      rows.flatMap((row) => (row.recurringId === null ? [] : [row.recurringId]))
    )
  }

  planSoftDelete(
    tenantId: number,
    userId: number,
    before: Transaction,
    revert: string
  ): LedgerBatchPlan {
    const db = this.db
    const plan = new LedgerBatchPlan()

    this.appendDelta(
      plan,
      tenantId,
      before.linkedAccountId,
      revert,
      'the account the row reverts from (exists and is ACTIVE)'
    )

    const audited = auditedUpdateStatements(db, {
      tenantId,
      id: before.id,
      userId,
      before,
      set: {
        status: 'DELETED',
        updateBy: userId,
        updateDt: stampFor(before),
      },
      action: 'DELETE',
    })

    plan.guarded(
      audited.update,
      1,
      'the row being deleted (optimistic concurrency)'
    )
    plan.add(audited.history)

    return plan
  }

  planReplaceSplits(
    tenantId: number,
    userId: number | null,
    transactionId: number,
    shares: readonly SplitShare[]
  ): LedgerBatchPlan {
    const db = this.db
    const plan = new LedgerBatchPlan()

    plan.add(
      db
        .update(transactionSplits)
        .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
        .where(
          and(
            eq(transactionSplits.tenantId, tenantId),
            eq(transactionSplits.transactionId, transactionId),
            eq(transactionSplits.status, 'ACTIVE')
          )
        )
    )

    if (shares.length > 0) {
      plan.append(
        this.planSplitsInsert(db, tenantId, userId, shares, transactionId)
      )
    }

    return plan
  }

  recordHistory(
    db: DbOrTx,
    tenantId: number,
    transactionId: number,
    userId: number | null,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    before: Transaction | null,
    after: Transaction | null
  ): LedgerStatement {
    return historyStatement(db, {
      tenantId,
      transactionId,
      userId,
      action,
      before,
      after,
    })
  }

  async findByIdInTx(
    db: DbOrTx,
    tenantId: number,
    id: number
  ): Promise<TransactionRow | undefined> {
    const [row] = await this.selectJoined(db).where(
      and(eq(transactions.tenantId, tenantId), eq(transactions.id, id))
    )

    return row === undefined
      ? undefined
      : (await this.withSplits(db, tenantId, [row]))[0]
  }

  async findInstallments(
    tenantId: number,
    groupId: string,
    db: DbOrTx = this.db
  ): Promise<TransactionRow[]> {
    const rows = await this.selectJoined(db)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.installmentGroupId, groupId),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactions.installmentNumber))

    return this.withSplits(db, tenantId, rows)
  }

  async sharesOfInTx(
    db: DbOrTx,
    tenantId: number,
    transactionId: number
  ): Promise<SplitShare[]> {
    const rows = await db
      .select({
        userId: transactionSplits.userId,
        share: transactionSplits.share,
      })
      .from(transactionSplits)
      .where(
        and(
          eq(transactionSplits.tenantId, tenantId),
          eq(transactionSplits.transactionId, transactionId),
          eq(transactionSplits.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactionSplits.userId))

    return rows
  }

  private planSplitsInsert(
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    shares: readonly SplitShare[],
    knownTransactionId?: number
  ): LedgerBatchPlan {
    const plan = new LedgerBatchPlan()
    const transactionId =
      knownTransactionId ??
      sql`(select max(${transactions.id}) from ${transactions} where ${transactions.tenantId} = ${tenantId})`

    plan.add(
      db.insert(transactionSplits).values(
        shares.map((entry) => ({
          tenantId,
          transactionId,
          userId: entry.userId,
          share: entry.share,
          createdBy: userId,
          updateBy: userId,
        }))
      )
    )

    return plan
  }

  private appendDelta(
    plan: LedgerBatchPlan,
    tenantId: number,
    accountId: number,
    delta: string,
    reason: string
  ): void {
    if (toCents(delta) !== 0n) {
      plan.guarded(
        balanceDeltaStatement(this.db, tenantId, accountId, delta),
        1,
        reason
      )
    }
  }

  private planRowUpdate(
    db: DbOrTx,
    tenantId: number,
    userId: number,
    before: Transaction,
    set: Record<string, unknown>
  ): LedgerBatchPlan {
    const plan = new LedgerBatchPlan()
    const stamp = stampFor(before)
    const audited = auditedUpdateStatements(db, {
      tenantId,
      id: before.id,
      userId,
      before,
      set: { ...set, updateBy: userId, updateDt: stamp },
      action: 'UPDATE',
    })

    plan.guarded(
      audited.update,
      1,
      'the transaction row (optimistic concurrency)'
    )
    plan.add(audited.history)

    return plan
  }

  private async planSiblingUpdate(
    tenantId: number,
    userId: number,
    sibling: PlannedSibling
  ): Promise<LedgerBatchPlan> {
    const plan = new LedgerBatchPlan()

    this.appendDelta(
      plan,
      tenantId,
      sibling.row.linkedAccountId,
      sibling.shift,
      'the transfer sibling’s account (exists and is ACTIVE)'
    )

    const placement = await this.statements.planTarget(
      this.db,
      tenantId,
      userId,
      sibling.target
    )

    plan.append(placement.batch)
    plan.append(
      this.planRowUpdate(this.db, tenantId, userId, sibling.row, {
        ...sibling.set,
        balanceOnDt: balanceSubselect(sibling.row.linkedAccountId),
        statementId: placement.statementId,
        statementPinned: placement.statementPinned,
      })
    )

    return plan
  }

  private joinedColumns(runningBalance: SQL<string>) {
    return {
      ...getTableColumns(transactions),
      accountName: sql<string>`coalesce(${accounts.name}, '')`,
      accountType: accounts.type,
      accountCloseDay: accounts.closeDay,
      accountDueDay: accounts.dueDay,
      accountCloseDayInclusive: accounts.closeDayInclusive,
      categoryName: sql<string>`coalesce(${categories.name}, '')`,
      categoryColor: sql<string>`coalesce(${categories.color}, '')`,
      receiverName: receivers.name,
      paidByName: payers.name,
      currency: accounts.currency,
      statementCloseDate: creditCardStatements.closeDate,
      statementDueDate: creditCardStatements.dueDate,
      paymentStatementDueDate: paymentStatements.dueDate,
      runningBalance,
      accountReconciledThrough: accounts.reconciledThrough,
    }
  }

  async forecastInputs(tenantId: number): Promise<{
    rules: ForecastRule[]
    activeAccounts: Array<{ id: number; currency: Currency }>
  }> {
    const [rules, activeAccounts] = await Promise.all([
      this.db
        .select({
          type: recurringTransactions.type,
          amount: recurringTransactions.amount,
          linkedAccountId: recurringTransactions.linkedAccountId,
          frequency: recurringTransactions.frequency,
          frequencyDay: recurringTransactions.frequencyDay,
          frequencyMonth: recurringTransactions.frequencyMonth,
        })
        .from(recurringTransactions)
        .where(
          and(
            eq(recurringTransactions.tenantId, tenantId),
            eq(recurringTransactions.status, 'ACTIVE')
          )
        ),
      this.db
        .select({ id: accounts.id, currency: accounts.currency })
        .from(accounts)
        .where(
          and(eq(accounts.tenantId, tenantId), eq(accounts.status, 'ACTIVE'))
        ),
    ])

    return { rules, activeAccounts }
  }

  private selectJoined(db: DbOrTx) {
    return db
      .select(this.joinedColumns(this.balances.runningBalanceOfRowSql()))
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(receivers, eq(transactions.receiverId, receivers.id))
      .leftJoin(payers, eq(transactions.paidByUserId, payers.id))
      .leftJoin(
        creditCardStatements,
        eq(transactions.statementId, creditCardStatements.id)
      )
      .leftJoin(
        paymentStatements,
        eq(transactions.paymentStatementId, paymentStatements.id)
      )
  }

  async findActiveSibling(
    tenantId: number,
    row: Transaction
  ): Promise<Transaction | undefined> {
    const db = this.db

    if (row.transferGroupId === null) {
      return undefined
    }

    const [sibling] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.transferGroupId, row.transferGroupId),
          ne(transactions.id, row.id),
          eq(transactions.status, 'ACTIVE')
        )
      )

    return sibling
  }

  private async findByTransferGroup(
    tenantId: number,
    transferGroupId: string
  ): Promise<TransactionRow[] | undefined> {
    const rows = await this.selectJoined(this.db)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.transferGroupId, transferGroupId),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactions.id))

    if (rows.length !== 2) {
      return undefined
    }

    return this.withSplits(this.db, tenantId, rows)
  }

  private async withSplits(
    db: DbOrTx,
    tenantId: number,
    rows: Array<Omit<TransactionRow, 'splits'>>
  ): Promise<TransactionRow[]> {
    if (rows.length === 0) {
      return []
    }

    const shares = await db
      .select({
        transactionId: transactionSplits.transactionId,
        userId: transactionSplits.userId,
        userName: users.name,
        share: transactionSplits.share,
      })
      .from(transactionSplits)
      .innerJoin(users, eq(transactionSplits.userId, users.id))
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
      .orderBy(asc(transactionSplits.userId))
    const byTransaction = new Map<number, TransactionSplitShare[]>()

    for (const { transactionId, ...share } of shares) {
      byTransaction.set(transactionId, [
        ...(byTransaction.get(transactionId) ?? []),
        share,
      ])
    }

    return rows.map((row) => ({
      ...row,
      splits: byTransaction.get(row.id) ?? [],
    }))
  }

  private filterToSql(tenantId: number, filter: TransactionFilter) {
    const conditions = [eq(transactions.tenantId, tenantId)]
    const day =
      filter.creditMode === 'cash'
        ? sql`coalesce(${creditCardStatements.dueDate}, ${transactions.transactionDt})`
        : sql`${transactions.transactionDt}`

    if (filter.transactionDtFrom !== undefined) {
      conditions.push(gte(day, filter.transactionDtFrom))
    }

    if (filter.transactionDtTo !== undefined) {
      conditions.push(lte(day, filter.transactionDtTo))
    }

    if (filter.statementId !== undefined) {
      conditions.push(eq(transactions.statementId, filter.statementId))
    }

    if (filter.paymentStatementId !== undefined) {
      conditions.push(
        eq(transactions.paymentStatementId, filter.paymentStatementId)
      )
    }

    if (filter.categoryId !== undefined) {
      conditions.push(eq(transactions.categoryId, filter.categoryId))
    }

    if (filter.linkedAccountId !== undefined) {
      conditions.push(eq(transactions.linkedAccountId, filter.linkedAccountId))
    }

    if (filter.receiverId !== undefined) {
      conditions.push(eq(transactions.receiverId, filter.receiverId))
    }

    if (filter.type !== undefined) {
      conditions.push(eq(transactions.type, filter.type))
    }

    if (filter.status !== undefined) {
      conditions.push(eq(transactions.reviewStatus, filter.status))
    }

    conditions.push(eq(transactions.status, filter.lifecycle))

    return and(...conditions)
  }
}

function col(value: SQL | SQL.Aliased): SQL {
  return sql`${value}`
}
