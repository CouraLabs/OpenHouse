import { randomUUID } from 'node:crypto'
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
  sql,
  type SQL,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type {
  Database,
  DbOrTx,
  Transaction,
  TransactionHistoryRow,
} from '@workspace/db'
import {
  accounts,
  categories,
  centsToDecimalSql,
  creditCardStatements,
  receivers,
  tenantSettings,
  transactionHistory,
  transactionSplits,
  transactions,
  users,
} from '@workspace/db'
import {
  addMoney,
  compareMoney,
  householdShares,
  isZeroMoney,
  negateMoney,
  STATEMENT_CLOSED,
} from '@workspace/poco'
import type {
  Currency,
  SearchTransactionsArgs,
  SplitShare,
  StatementWarning,
  TransactionBreakdownArgs,
  TransactionSplitShare,
  TransactionFilter,
  TransactionStatus,
  TransactionType,
} from '@workspace/poco'

import { BalanceRepository } from '../balances/balance.repository.js'
import {
  balanceDeltaStatement,
  balanceSubselect,
  LedgerBatchPlan,
  stampFor,
  type LedgerStatement,
} from '../common/ledger/ledger-batch.js'
import {
  auditedUpdateStatements,
  createdRowHistoryStatement,
  historyStatement,
} from '../common/ledger/transaction-history.js'
import { isAnyUniqueViolation } from '../common/db-errors.js'
import { buildPagedQuery } from '../common/search/fetch.helper.js'
import {
  CreditCardStatementRepository,
} from '../credit-card-statements/credit-card-statement.repository.js'
import { appliedDeltaFor } from './transaction-ledger.js'

export type TransactionRow = Transaction & {
  accountName: string
  categoryName: string
  categoryColor: string
  receiverName: string | null
  paidByName: string | null
  splits: TransactionSplitShare[]
  currency: Currency
  statementDueDate: string | null
  paymentStatementDueDate: string | null
  runningBalance: string
  locked: boolean
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

const paymentStatements = alias(creditCardStatements, 'payment_statement')

const payers = alias(users, 'payer')

export class TransactionRepository {
  constructor(
    private readonly db: Database,
    private readonly statements: CreditCardStatementRepository,
    private readonly balances: BalanceRepository
  ) {}

  async insertWithBalance(
    tenantId: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow> {
    const group = await this.planInsertGroup(this.db, tenantId, userId, write)
    const results = await group.plan.run(this.db)

    const row = await this.readInsertedRow(tenantId, results, group.insertIndex)

    return withWarning(row as TransactionRow, group) as TransactionRow
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
    write: TransactionWrite
  ): Promise<TransactionRow | undefined> {
    const group = await this.planInsertGroup(this.db, tenantId, null, write)

    try {
      const results = await group.plan.run(this.db)

      return withWarning(
        await this.readInsertedRow(tenantId, results, group.insertIndex),
        group
      )
    } catch (error) {
      if (isAnyUniqueViolation(error)) {
        return undefined
      }

      throw error
    }
  }

  async planInsertGroup(
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    write: TransactionWrite
  ): Promise<{ plan: LedgerBatchPlan; closed: boolean; insertIndex: number }> {
    const { installment, splits, ...columns } = write
    const placement = await this.statements.planPlacement(
      db,
      tenantId,
      userId,
      {
        linkedAccountId: write.linkedAccountId,
        transactionDt: write.transactionDt,
        type: write.type,
        isTransferLeg: write.transferGroupId !== undefined,
      },
      installment === undefined
        ? 0
        : (installment.billOffset ?? installment.number - 1)
    )
    const stamp = new Date()
    const plan = new LedgerBatchPlan()

    plan.append(placement.batch)
    plan.guarded(
      balanceDeltaStatement(
        db,
        tenantId,
        write.linkedAccountId,
        appliedDeltaFor(write)
      ),
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
        paidByUserId:
          write.paidByUserId === undefined ? userId : write.paidByUserId,
        balanceOnDt: balanceSubselect(write.linkedAccountId),
        statementId: placement.statementId,
        ...(installment === undefined
          ? {}
          : {
              installmentGroupId: installment.groupId,
              installmentNumber: installment.number,
              installmentCount: installment.count,
              statementPinned: placement.statementId !== null,
            }),
      })
      .returning()

    const insertIndex = plan.size

    plan.add(row)
    plan.add(
      createdRowHistoryStatement(db, { tenantId, userId, stamp })
    )

    const shares = await this.sharesForInsert(db, tenantId, write, userId)

    if (shares.length > 0) {
      plan.append(this.planSplitsInsert(db, tenantId, userId, shares))
    }

    return { plan, closed: placement.closed, insertIndex }
  }

  async updateWithBalance(
    tenantId: number,
    id: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow | undefined> {
    const { splits, ...columns } = write

    const before = (await this.findById(
      tenantId,
      id
    )) as TransactionRow | undefined

    if (before === undefined || before.status === 'DELETED') {
      return undefined
    }

    const sibling = await this.findActiveSibling(this.db, tenantId, before)
    const placement = await this.statements.planReplacement(
      this.db,
      tenantId,
      userId,
      assignedOf(before),
      {
        linkedAccountId: write.linkedAccountId,
        transactionDt: write.transactionDt,
        type: write.type,
        isTransferLeg: before.transferGroupId !== null,
      }
    )
    const plan = new LedgerBatchPlan()

    plan.append(placement.batch)

    this.appendDeltaRevert(plan, this.db, tenantId, before)
    this.appendDeltaApply(
      plan,
      this.db,
      tenantId,
      write.linkedAccountId,
      appliedDeltaFor(write)
    )

    plan.append(
      this.planRowUpdate(this.db, tenantId, userId, before, {
        ...columns,
        balanceOnDt: balanceSubselect(write.linkedAccountId),
        statementId: placement.statementId,
        statementPinned: placement.statementPinned,
      })
    )

    if (splits !== undefined) {
      plan.append(this.planReplaceSplits(this.db, tenantId, userId, id, splits))
    }

    if (sibling !== undefined) {
      plan.append(
        await this.planSiblingUpdate(this.db, tenantId, userId, sibling, write)
      )
    }

    await plan.run(this.db)

    return withWarning(await this.findById(tenantId, id), placement)
  }

  async moveToStatement(
    tenantId: number,
    id: number,
    userId: number,
    statementId: number
  ): Promise<TransactionRow | undefined> {
    const row = (await this.findById(tenantId, id)) as TransactionRow | undefined

    if (row === undefined || row.status === 'DELETED') {
      return undefined
    }

    const target = await this.statements.findForMove(
      this.db,
      tenantId,
      statementId
    )

    if (target === undefined || target.statement.accountId !== row.linkedAccountId) {
      return undefined
    }

    const payment = isPaymentRow(row)
    const stamp = stampFor(row)
    const plan = new LedgerBatchPlan()

    plan.addNullable(target.closedStamp)
    plan.append(
      this.planRowUpdate(this.db, tenantId, userId, row, {
        ...(payment
          ? { paymentStatementId: statementId }
          : { statementId, statementPinned: true }),
        updateBy: userId,
        updateDt: stamp,
      })
    )

    await plan.run(this.db)

    const moved = (await this.findById(tenantId, id)) as TransactionRow

    return payment
      ? moved
      : withWarning(moved, { closed: target.closed })
  }

  async updateStatus(
    tenantId: number,
    id: number,
    userId: number,
    reviewStatus: TransactionStatus
  ): Promise<TransactionRow | undefined> {
    const before = (await this.findById(tenantId, id)) as TransactionRow | undefined

    if (before === undefined || before.status === 'DELETED') {
      return undefined
    }

    const sibling = await this.findActiveSibling(this.db, tenantId, before)
    const plan = new LedgerBatchPlan()

    this.appendStatusFlip(plan, this.db, tenantId, userId, before, reviewStatus)

    if (sibling !== undefined) {
      this.appendStatusFlip(
        plan,
        this.db,
        tenantId,
        userId,
        sibling,
        reviewStatus
      )
    }

    await plan.run(this.db)

    return this.findById(tenantId, id)
  }

  async softDeleteWithBalance(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Transaction | undefined> {
    const before = (await this.findById(tenantId, id)) as TransactionRow | undefined

    if (before === undefined) {
      return undefined
    }

    if (before.status === 'DELETED') {
      return before
    }

    const sibling = await this.findActiveSibling(this.db, tenantId, before)
    const plan = new LedgerBatchPlan()

    plan.append(this.planSoftDeleteGroup(this.db, tenantId, userId, before))

    if (sibling !== undefined) {
      plan.append(this.planSoftDeleteGroup(this.db, tenantId, userId, sibling))
    }

    await plan.run(this.db)

    return this.findById(tenantId, id)
  }

  async insertTransfer(
    tenantId: number,
    userId: number,
    write: TransferWrite
  ): Promise<[TransactionRow, TransactionRow] | undefined> {
    const transferGroupId = randomUUID()

    let closedStamp: LedgerStatement | null = null
    if (write.paymentStatementId !== null) {
      const target = await this.statements.findForMove(
        this.db,
        tenantId,
        write.paymentStatementId
      )

      if (target === undefined || target.statement.accountId !== write.toAccountId) {
        return undefined
      }

      closedStamp = target.closedStamp
    }

    const plan = new LedgerBatchPlan()

    plan.addNullable(closedStamp)

    const from = await this.planInsertGroup(this.db, tenantId, userId, {
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
    const to = await this.planInsertGroup(this.db, tenantId, userId, {
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

    plan.append(from.plan)
    plan.append(to.plan)

    await plan.run(this.db)

    const inserted = await this.findByTransferGroup(
      tenantId,
      transferGroupId
    )

    return inserted as [TransactionRow, TransactionRow]
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

    return rows.map((row) => ({
      ...row,
      net: addMoney(row.incomes, negateMoney(row.expenses)),
    }))
  }

  async breakdown(
    tenantId: number,
    dimension: TransactionBreakdownArgs['dimension'],
    filter: TransactionFilter
  ) {
    const nameColumn =
      dimension === 'category' ? categories.name : accounts.name
    const colorColumn = dimension === 'category' ? categories.color : undefined

    const totals = await this.db
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
        ...(colorColumn === undefined ? [] : [colorColumn])
      )

    const groups = new Map<
      Currency,
      Array<{ name: string; color: string | null; total: string }>
    >()

    for (const row of totals.sort((a, b) => compareMoney(b.total, a.total))) {
      const items = groups.get(row.currency) ?? []

      items.push({ name: row.name, color: row.color, total: row.total })
      groups.set(row.currency, items)
    }

    return [...groups].map(([currency, items]) => ({ currency, items }))
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

  planSoftDeleteGroup(
    db: DbOrTx,
    tenantId: number,
    userId: number,
    before: Transaction
  ): LedgerBatchPlan {
    const plan = new LedgerBatchPlan()
    const revert = negateMoney(appliedDeltaFor(before))

    if (!isZeroMoney(revert)) {
      plan.guarded(
        balanceDeltaStatement(db, tenantId, before.linkedAccountId, revert),
        1,
        'the account the row reverts from (exists and is ACTIVE)'
      )
    }

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
    db: DbOrTx,
    tenantId: number,
    userId: number | null,
    transactionId: number,
    shares: readonly SplitShare[]
  ): LedgerBatchPlan {
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
      plan.append(this.planSplitsInsert(db, tenantId, userId, shares, transactionId))
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
      .select({ userId: transactionSplits.userId, share: transactionSplits.share })
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

  private async sharesForInsert(
    db: DbOrTx,
    tenantId: number,
    write: TransactionWrite,
    userId: number | null
  ): Promise<SplitShare[]> {
    if (write.splits !== undefined) {
      return write.splits
    }

    const paidByUserId =
      write.paidByUserId === undefined ? userId : write.paidByUserId

    if (
      write.type !== 'Expense' ||
      paidByUserId === null ||
      write.transferGroupId !== undefined ||
      write.isAdjustment === true ||
      write.isSettlement === true
    ) {
      return []
    }

    const [settings] = await db
      .select({ unsplitMode: tenantSettings.unsplitMode })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))

    if (settings?.unsplitMode !== 'household') {
      return []
    }

    const [account] = await db
      .select({ ownership: accounts.ownership })
      .from(accounts)
      .where(eq(accounts.id, write.linkedAccountId))

    if (account?.ownership === 'shared') {
      return []
    }

    const members = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.id))

    return householdShares(
      write.amount,
      members.map((member) => member.id),
      paidByUserId
    )
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

  private appendDeltaRevert(
    plan: LedgerBatchPlan,
    db: DbOrTx,
    tenantId: number,
    before: Transaction
  ): void {
    const revert = negateMoney(appliedDeltaFor(before))

    if (!isZeroMoney(revert)) {
      plan.guarded(
        balanceDeltaStatement(db, tenantId, before.linkedAccountId, revert),
        1,
        'the account the row reverts from (exists and is ACTIVE)'
      )
    }
  }

  private appendDeltaApply(
    plan: LedgerBatchPlan,
    db: DbOrTx,
    tenantId: number,
    accountId: number,
    delta: string
  ): void {
    if (!isZeroMoney(delta)) {
      plan.guarded(
        balanceDeltaStatement(db, tenantId, accountId, delta),
        1,
        'the account the row applies to (exists and is ACTIVE)'
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

    plan.guarded(audited.update, 1, 'the transaction row (optimistic concurrency)')
    plan.add(audited.history)

    return plan
  }

  private async planSiblingUpdate(
    db: DbOrTx,
    tenantId: number,
    userId: number,
    sibling: Transaction,
    write: TransactionWrite
  ): Promise<LedgerBatchPlan> {
    const plan = new LedgerBatchPlan()

    const shift = addMoney(
      appliedDeltaFor({
        type: sibling.type,
        amount: write.amount,
        reviewStatus: write.reviewStatus,
      }),
      negateMoney(appliedDeltaFor(sibling))
    )

    if (!isZeroMoney(shift)) {
      plan.guarded(
        balanceDeltaStatement(db, tenantId, sibling.linkedAccountId, shift),
        1,
        'the transfer sibling’s account (exists and is ACTIVE)'
      )
    }

    const placement = await this.statements.planReplacement(
      db,
      tenantId,
      userId,
      assignedOf(sibling),
      {
        linkedAccountId: sibling.linkedAccountId,
        transactionDt: write.transactionDt,
        type: sibling.type,
        isTransferLeg: true,
      }
    )

    plan.append(placement.batch)
    plan.append(
      this.planRowUpdate(db, tenantId, userId, sibling, {
        amount: write.amount,
        transactionDt: write.transactionDt,
        categoryId: write.categoryId,
        note: write.note,
        reviewStatus: write.reviewStatus,
        statusNote: write.statusNote,
        balanceOnDt: balanceSubselect(sibling.linkedAccountId),
        statementId: placement.statementId,
        statementPinned: placement.statementPinned,
      })
    )

    return plan
  }

  private appendStatusFlip(
    plan: LedgerBatchPlan,
    db: DbOrTx,
    tenantId: number,
    userId: number,
    before: Transaction,
    reviewStatus: TransactionStatus
  ): void {
    const shift = addMoney(
      appliedDeltaFor({ ...before, reviewStatus }),
      negateMoney(appliedDeltaFor(before))
    )

    if (!isZeroMoney(shift)) {
      plan.guarded(
        balanceDeltaStatement(db, tenantId, before.linkedAccountId, shift),
        1,
        'the account the status flip moves (exists and is ACTIVE)'
      )
    }

    plan.append(
      this.planRowUpdate(db, tenantId, userId, before, { reviewStatus })
    )
  }

  private joinedColumns(runningBalance: SQL<string>) {
    return {
      ...getTableColumns(transactions),
      accountName: sql<string>`coalesce(${accounts.name}, '')`,
      categoryName: sql<string>`coalesce(${categories.name}, '')`,
      categoryColor: sql<string>`coalesce(${categories.color}, '')`,
      receiverName: receivers.name,
      paidByName: payers.name,
      currency: accounts.currency,
      statementDueDate: creditCardStatements.dueDate,
      paymentStatementDueDate: paymentStatements.dueDate,
      runningBalance,
      locked: sql<boolean>`coalesce(${transactions.transactionDt} <= ${accounts.reconciledThrough}, false)`.mapWith(
        Boolean
      ),
    }
  }

  private selectJoined(db: DbOrTx) {
    return db
      .select(
        this.joinedColumns(this.balances.runningBalanceOfRowSql())
      )
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

  private async findActiveSibling(
    db: DbOrTx,
    tenantId: number,
    row: Transaction
  ): Promise<Transaction | undefined> {
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

    return rows.map((row) => ({ ...row, splits: byTransaction.get(row.id) ?? [] }))
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

function isPaymentRow(row: Transaction): boolean {
  return (
    row.type === 'Income' &&
    row.transferGroupId !== null &&
    row.statementId === null
  )
}

function assignedOf(row: Transaction) {
  return {
    linkedAccountId: row.linkedAccountId,
    transactionDt: row.transactionDt,
    type: row.type,
    isTransferLeg: row.transferGroupId !== null,
    statementId: row.statementId,
    statementPinned: row.statementPinned,
  }
}

function withWarning(
  row: TransactionRow | undefined,
  placement: { closed: boolean }
): TransactionRow | undefined {
  if (row === undefined) {
    return undefined
  }

  return placement.closed ? { ...row, warning: STATEMENT_CLOSED } : row
}
