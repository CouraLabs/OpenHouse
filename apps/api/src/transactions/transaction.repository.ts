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
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
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

/**
 * A transaction row with the display fields joined on — what every read
 * answers. The web never resolves an id into a label; the joined `currency`
 * is the linked account's denomination, so the UI never formats a BRL
 * amount with a dollar symbol.
 */
export type TransactionRow = Transaction & {
  accountName: string
  categoryName: string
  categoryColor: string
  receiverName: string | null
  /** The payer's name, joined. */
  paidByName: string | null
  /** How the row is shared; empty when unsplit. */
  splits: TransactionSplitShare[]
  currency: Currency
  /** The due date of the card bill the row is on, joined. */
  statementDueDate: string | null
  /** The due date of the card bill the row pays, joined. */
  paymentStatementDueDate: string | null
  /** The account's balance right after the row in `(transactionDt, id)`
   * order: the opening balance plus every earlier applied delta. */
  runningBalance: string
  /** Whether the row is on or before its account's `reconciledThrough`. */
  locked: boolean
  /** Set only on a write's answer: the row landed on a closed bill. */
  warning?: StatementWarning
}

/** What a search answers with: the page's rows and how many match in all. */
export interface TransactionSearch {
  rows: TransactionRow[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. The
 * review workflow rides as `reviewStatus` — the entity lifecycle keeps the
 * `status` column. */
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
  /** Set only by a reconciliation: the row moves the balance but is no
   * income or expense. */
  isAdjustment?: boolean
  /** The member who paid. Left out on an insert it defaults to the acting
   * user; left out on an update the stored payer is kept. */
  paidByUserId?: number | null
  /** Whether the row settles a debt between members — set only by a
   * settle-up. */
  isSettlement?: boolean
  /** The resolved shares to store. Left out on an insert, an unsplit
   * expense under the household-wide setting is shared equally between the
   * active members; left out on an update, the stored shares are kept.
   * Empty clears them. */
  splits?: SplitShare[]
  /** The id both sides of one transfer share — set only by `insertTransfer`. */
  transferGroupId?: string
  /** The bill a payment settles — set only by `insertTransfer`, on the
   * card side. */
  paymentStatementId?: number
  /** Which installment of which purchase the row is — set only by the
   * installment writes. The row lands on its first bill plus `number − 1`
   * cycles, pinned there, so no later date logic moves it. An imported
   * installment already sits in the cycle its own day names, so it passes
   * `billOffset: 0` instead. */
  installment?: {
    groupId: string
    number: number
    count: number
    billOffset?: number
  }
  /** The bank's own id for the row (OFX `FITID`) — set only by a statement
   * import. */
  externalId?: string
  /** The statement import that wrote the row — set only by a statement
   * import. */
  importBatchId?: string
}

/** A transfer writes two rows from one body. */
export interface TransferWrite {
  amount: string
  transactionDt: string
  categoryId: number
  fromAccountId: number
  toAccountId: number
  note: string | null
  /** The bill of the destination card the transfer pays, or nothing when
   * the destination is no card (or a card with no bills). */
  paymentStatementId: number | null
  /** Set when the transfer settles a debt: the paying leg is paid by
   * `fromUserId` and shared in full with `toUserId`, and both legs are
   * flagged as settlements. */
  settlement?: { fromUserId: number; toUserId: number }
}

/** The bills a payment row joins its due date from — the row's own bill
 * keeps the plain table name, which the cash-mode filter dates by. */
const paymentStatements = alias(creditCardStatements, 'payment_statement')

/** The payer's user row, joined for the name. */
const payers = alias(users, 'payer')

/**
 * The transaction rows, reached only through the tenant of the session.
 * Every method takes the tenant id explicitly — the repository never
 * decides who is asking.
 *
 * Every write is also a ledger write: the linked account's balance moves
 * with the transaction — except while it is Canceled, money that did not
 * move — in the same batch the row is written in, and a
 * `transaction_history` row records the full before/after snapshot. The
 * audit trail stamps the acting user; a system write (the recurring cron)
 * leaves it null.
 *
 * D1 has no interactive transactions, so every write is one batch whose
 * statements were all built from pre-reads: the balance moves by a
 * **relative**, guarded update (`balance = balance + delta`), the row's
 * write carries an **optimistic** `update_dt` guard, and the history entry
 * is gated in SQL on the write it records. A guard that matched no rows
 * throws `LedgerConflictError`, answered 409.
 */
@Injectable()
export class TransactionRepository {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly statements: CreditCardStatementRepository,
    private readonly balances: BalanceRepository
  ) {}

  /**
   * Inserts a transaction and applies its delta to the account, in one
   * batch of its own.
   */
  async insertWithBalance(
    tenantId: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow> {
    const group = await this.planInsertGroup(this.db, tenantId, userId, write)
    const results = await group.plan.run(this.db)

    const row = await this.readInsertedRow(tenantId, results, group.insertIndex)

    // The row was just written; the read cannot come back empty.
    return withWarning(row as TransactionRow, group) as TransactionRow
  }

  /** The row an insert's `RETURNING` answered, joined — the caller of the
   * batch reads its answer at the statement's index. */
  async readInsertedRow(
    tenantId: number,
    results: unknown[],
    insertIndex: number
  ): Promise<TransactionRow> {
    const rows = results[insertIndex] as Array<Record<string, unknown>>
    const id = rows[0].id as number

    // The row was just written; the read cannot come back empty.
    return (await this.findById(tenantId, id)) as TransactionRow
  }

  /**
   * Inserts a transaction the recurring cron generated: the same ledger
   * mechanics as `insertWithBalance`, with the audit trail left null — the
   * row is the system's, not a user's. The partial unique index on
   * `(tenant_id, recurring_id, transaction_dt)` is the last line of
   * defense: when another replica materialized the day first, the batch
   * fails on it and this answers `undefined` instead of double-billing.
   */
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

  /**
   * The statements one transaction insert needs, as a composable plan —
   * the bill placement (a get-or-create, when the day opens a new bill),
   * the guarded balance move, the row written with the post-delta balance
   * stamped, its history entry, and its shares. Multi-row writers (the
   * installment plans, the statement import) append one group per row into
   * one batch, in money order.
   */
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
        // Whoever enters an expense paid it, unless the write names the
        // payer (or states that nobody did).
        paidByUserId:
          write.paidByUserId === undefined ? userId : write.paidByUserId,
        // The account's balance after the batch's guarded delta applied.
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

  /**
   * Updates a transaction: reverts the old delta from its account, applies
   * the new one (which may be a different account), and records the history.
   * A Canceled row applied nothing, so nothing is reverted for it, and a
   * write saving `Canceled` applies nothing; `balanceOnDt` then carries the
   * account's balance as the edit found it.
   *
   * The row (and a transfer's other side) is written under an optimistic
   * `update_dt` guard, so a soft delete or an edit racing the update
   * answers 409 — whichever write ran first wins, and the loser never
   * reverts the same delta twice. The other side of a transfer is updated
   * in the same batch with the fields the pair shares, so editing one side
   * never leaves the books unbalanced.
   */
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

  /**
   * Moves a card charge to another bill of the same card by hand and pins
   * it there: later date edits no longer re-resolve it (a merchant posted
   * late and the bank billed it a cycle on). On the card side of a payment
   * it re-points the bill the payment settles instead — a payment is on no
   * bill, so there is nothing to pin. The caller checked the bill belongs
   * to the row's card; the row is written under its optimistic guard, and
   * the bill's `closedAt` stamp rides the same batch. Answers `undefined`
   * when the row or the bill is gone.
   */
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

  /**
   * Changes only a transaction's review status: no amount, account, or day
   * is written. Canceled is the one status that moves money — a canceled
   * transaction is money that did not move — so cancelling reverts the
   * row's delta from its account and un-cancelling re-applies it, while
   * Checked ↔ Verify leaves the balance alone. `balanceOnDt` keeps the
   * value stamped when the amount last applied: a status change never
   * rewrites it, so a Canceled row shows the balance it once left behind.
   *
   * The row and the other side of a transfer are written under optimistic
   * guards, both deltas reverted or re-applied together: flipping one side
   * alone would move the pair's money into one account and out of none.
   */
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

  /**
   * Soft-deletes a transaction: reverts its delta from the account, marks
   * the row DELETED, and records the history. A Canceled row applied
   * nothing, so deleting it reverts nothing. A transfer side takes its
   * other side with it — deleting one side alone would give money back to
   * one account while the other keeps it, inventing money.
   */
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

  /**
   * Writes both sides of a transfer — an Expense on the source and an
   * Income on the destination — in one batch, so the money never vanishes
   * between two rows. Both rows carry the same `transferGroupId`, the link
   * every later write keeps the pair by.
   *
   * A payment's bill is read before the batch, and its `closedAt` stamp
   * rides the same batch, so a cycle resync cannot retire it mid-write
   * without failing the whole transfer. Answers `undefined` when that bill
   * is gone or belongs to another card.
   */
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
      // A transfer is nobody's expense — except a settle-up, which the
      // debtor pays and the creditor receives in full.
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

    // Both sides were just written; the read cannot come back short.
    return inserted as [TransactionRow, TransactionRow]
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
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

    // The id is the tie-breaker: rows the sort clauses leave equal keep
    // one order, so a page never shuffles its neighbors. A sort that
    // already names the id needs no tie-break — the id is unique.
    const sortsId = args.sort.some((clause) => clause.field === 'id')

    // The window is computed over each whole account in the CTE; the
    // filters, the sort, and the page apply only afterwards, on the joined
    // rows — so a filtered or paged view still shows the true balance.
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

  /**
   * Reads one transaction of the tenant with the joined names — deleted
   * rows included; the caller decides what to show.
   */
  async findById(
    tenantId: number,
    id: number
  ): Promise<TransactionRow | undefined> {
    return this.findByIdInTx(this.db, tenantId, id)
  }

  /**
   * Totals the tenant's transactions over a filter, grouped by the linked
   * account's currency, so mixed-currency tenants never sum across
   * currencies. One grouped query answers the whole summary.
   *
   * Transfer rows and Canceled review statuses never count: the two sides
   * of a transfer would count the same money as an income and an expense,
   * and a canceled transaction is money that did not move. A reconciliation
   * adjustment moves the balance but is neither income nor expense, so it
   * stays out too (the same in `breakdown` and the limit usage).
   */
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

  /**
   * Totals the tenant's expenses over a filter, grouped by the dimension a
   * breakdown names — the category an expense belongs to, or the account it
   * moved through — one group per currency, largest slice first. Transfer
   * rows and Canceled review statuses never count, as in `summary`: the two
   * sides of a transfer are not spending, and a canceled transaction is
   * money that did not move.
   */
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
        // The color rides along so a category slice paints in the color the
        // tenant picked; grouping by it keeps one row per category even when
        // two categories share a name.
        ...(colorColumn === undefined ? [] : [colorColumn])
      )

    // One group per currency, its slices ordered largest first — the pies
    // render one chart per group.
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

  /**
   * Totals the tenant's expenses between two `YYYY-MM-DD` days, grouped by
   * the category and the account's currency, with how many expenses each
   * total sums — the raw material a limit's usage sums from, so the limits
   * feature never re-derives what a transaction is.
   * Transfer rows and Canceled review statuses never count, as in
   * `summary`.
   *
   * Installments count by accrual: every installment of a purchase keeps
   * the purchase day, so a 10× purchase counts in full in the period it
   * was bought — not one tenth per bill. A per-installment ("cash") view
   * of limits is out of scope.
   */
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

  /** Reads a transaction's history, newest first, paged. */
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

  /** Answers whether a recurring rule has an ACTIVE transaction on a day —
   * the idempotency check the cron runs before inserting. A deleted
   * transaction does not block the day: the rule generates again. */
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

  /** The ids of the recurring rules that already generated an ACTIVE
   * transaction on a day — what the upcoming list must not count twice. */
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

  /**
   * The plan of one row's soft delete: the guarded revert of its applied
   * delta, the row marked DELETED under its optimistic guard, and the
   * gated history entry. Multi-row writers (the installment groups, the
   * import undo) append one group per row into one batch.
   */
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

  /**
   * Replaces a transaction's shares: the ACTIVE ones are marked DELETED —
   * split rows are never removed — and the new ones inserted, as the
   * statements of one plan. The caller validated the shares.
   */
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

  /** Records one append-only history row with the full snapshots — the
   * plain form, for a write whose before and after are both known. */
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

  /** Re-reads one row with the joined names, inside the given handle. */
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

  /** Reads the ACTIVE installments of one purchase with the joined names,
   * in order. */
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

  /** The ACTIVE shares of one transaction, in member order. */
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

  /**
   * The shares a new row is stored with: the ones the write names, or — for
   * a real expense nobody split — equal shares between the active members
   * when the tenant reads unsplit expenses as household-wide. The shares
   * are stored then, so a later change of setting or of membership never
   * rewrites what the household already agreed to.
   */
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

  /** The split-insert statements of one transaction — its id resolved by
   * the newest-row subselect when the caller has not read it back yet. */
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

  /** The guarded revert of a row's applied delta — skipped when the row
   * applied none (a Canceled row), which is what makes un-cancelling and
   * cancelling symmetric. */
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

  /** The guarded application of a write's delta — skipped when the write
   * applies none (saving `Canceled`). */
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

  /** One row's audited update: the optimistic write and its gated history
   * entry, with the row count the plan checks. */
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

  /**
   * The other side of a transfer, kept in step with an update of one side:
   * the fields the pair shares — amount, day, category, note, review
   * status — are mirrored, each side's own account and direction kept. The
   * mirrored amounts keep the books balanced: the money moved by the pair
   * stays the same both sides, and a Canceled pair moves none on either.
   */
  private async planSiblingUpdate(
    db: DbOrTx,
    tenantId: number,
    userId: number,
    sibling: Transaction,
    write: TransactionWrite
  ): Promise<LedgerBatchPlan> {
    const plan = new LedgerBatchPlan()

    // The sibling's account never changes: revert and apply collapse into
    // one guarded shift.
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

    // The mirrored day may move a card side to another bill.
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

  /** One row's review-status flip: the delta the new status applies minus
   * the one the old did — nonzero only into or out of Canceled — guarded
   * on the account, and the row written under its optimistic guard. */
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

  /** The columns every read answers: the row, the joined display fields,
   * the chronological running balance, and the reconciliation lock. */
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

  /** The joined select the by-id reads share. The running balance is the
   * correlated single-row form; a page of rows joins the window instead
   * (`search`). */
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

  /** Reads the ACTIVE other side of a transfer by the group id the pair
   * shares — nothing for a plain transaction or a side already deleted. */
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

  /** The rows of one transfer, by the group id the pair shares — what a
   * transfer write answers. */
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

  /** Attaches each row's ACTIVE shares, names joined. */
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

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, filter: TransactionFilter) {
    const conditions = [eq(transactions.tenantId, tenantId)]
    // Cash mode dates a card charge by its bill's due date — the day the
    // money leaves the paying account; rows on no bill keep their own day.
    // Every query running this filter left-joins the bills.
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

/** A CTE column as a plain expression — the alias is the column's name in
 * the CTE's output, and formatting reads the value through it. */
function col(value: SQL | SQL.Aliased): SQL {
  return sql`${value}`
}

/** Whether a row is the card side of a payment — an Income transfer leg
 * on no bill by date. Its bill is the one it settles. */
function isPaymentRow(row: Transaction): boolean {
  return (
    row.type === 'Income' &&
    row.transferGroupId !== null &&
    row.statementId === null
  )
}

/** A stored row's bill fields, as the assignment rule reads them. */
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

/** Flags a write's answer when the row landed on a closed bill. */
function withWarning(
  row: TransactionRow | undefined,
  placement: { closed: boolean }
): TransactionRow | undefined {
  if (row === undefined) {
    return undefined
  }

  return placement.closed ? { ...row, warning: STATEMENT_CLOSED } : row
}
