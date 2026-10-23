import { randomUUID } from 'node:crypto'
import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  isNull,
  lte,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
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
  creditCardStatements,
  receivers,
  transactionHistory,
  transactions,
} from '@workspace/db'
import {
  addMoney,
  compareMoney,
  isZeroMoney,
  negateMoney,
  STATEMENT_CLOSED,
} from '@workspace/poco'
import type {
  Currency,
  SearchTransactionsArgs,
  StatementWarning,
  TransactionBreakdownArgs,
  TransactionFilter,
  TransactionStatus,
  TransactionType,
} from '@workspace/poco'

import { BalanceRepository } from '../balances/balance.repository.js'
import { buildPagedQuery } from '../common/search/fetch.helper.js'
import {
  CreditCardStatementRepository,
  type StatementPlacement,
} from '../credit-card-statements/credit-card-statement.repository.js'
import {
  appliedDeltaFor,
  applyTransactionDelta,
  lockAccounts,
  retryOnLockConflict,
} from './transaction-ledger.js'

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
  /** The id both sides of one transfer share — set only by `insertTransfer`. */
  transferGroupId?: string
  /** The bill a payment settles — set only by `insertTransfer`, on the
   * card side. */
  paymentStatementId?: number
  /** Which installment of which purchase the row is — set only by the
   * installment writes. The row lands on its first bill plus `number − 1`
   * cycles, pinned there, so no later date logic moves it. */
  installment?: { groupId: string; number: number; count: number }
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
}

/** The bills a payment row joins its due date from — the row's own bill
 * keeps the plain table name, which the cash-mode filter dates by. */
const paymentStatements = alias(creditCardStatements, 'payment_statement')

/**
 * The transaction rows, reached only through the tenant of the session.
 * Every method takes the tenant id explicitly — the repository never
 * decides who is asking.
 *
 * Every write is also a ledger write: the linked account's balance moves
 * with the transaction — except while it is Canceled, money that did not
 * move — both inside one database transaction, and a
 * `transaction_history` row records the full before/after snapshot. The
 * audit trail stamps the acting user; a system write (the recurring cron)
 * leaves it null.
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
   * database transaction of its own.
   */
  async insertWithBalance(
    tenantId: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow> {
    return this.inLedgerTx(async (tx) =>
      this.insertInTx(tx, tenantId, userId, write)
    )
  }

  /**
   * Inserts a transaction the recurring cron generated: the same ledger
   * mechanics as `insertWithBalance`, with the audit trail left null — the
   * row is the system's, not a user's. The partial unique index on
   * `(tenant_id, recurring_id, transaction_dt)` is the last line of
   * defense: when another replica materialized the day first, this answers
   * `undefined` instead of double-billing.
   */
  async insertGenerated(
    tenantId: number,
    write: TransactionWrite
  ): Promise<TransactionRow | undefined> {
    return this.inLedgerTx(async (tx) => {
      try {
        return await this.insertInTx(tx, tenantId, null, write)
      } catch (error) {
        if (isUniqueViolation(error)) {
          return undefined
        }

        throw error
      }
    })
  }

  /**
   * Updates a transaction: reverts the old delta from its account, applies
   * the new one (which may be a different account), and records the history.
   * A Canceled row applied nothing, so nothing is reverted for it, and a
   * write saving `Canceled` applies nothing; `balanceOnDt` then carries the
   * account's balance as the edit found it.
   *
   * The row (and a transfer's other side) is locked `FOR UPDATE` and its
   * lifecycle checked inside the database transaction, so a soft delete
   * racing the update serializes — whichever ran first wins, and the loser
   * answers `undefined` instead of reverting the same delta twice. Every
   * account the write touches is then locked in one global order before any
   * delta moves. The other side of a transfer is updated in the same
   * transaction with the fields the pair shares, so editing one side never
   * leaves the books unbalanced.
   */
  async updateWithBalance(
    tenantId: number,
    id: number,
    userId: number,
    write: TransactionWrite
  ): Promise<TransactionRow | undefined> {
    return this.inLedgerTx(async (tx) => {
      const locked = await this.lockInTx(tx, tenantId, id)

      if (locked === undefined || locked.status === 'DELETED') {
        return undefined
      }

      const before = (await this.findByIdInTx(
        tx,
        tenantId,
        id
      )) as TransactionRow
      const sibling = await this.findActiveSiblingInTx(tx, tenantId, before)

      await lockAccounts(tx, tenantId, [
        before.linkedAccountId,
        write.linkedAccountId,
        ...(sibling === undefined ? [] : [sibling.linkedAccountId]),
      ])

      await applyTransactionDelta(
        tx,
        tenantId,
        before.linkedAccountId,
        negateMoney(appliedDeltaFor(before))
      )

      const newBalance = await applyTransactionDelta(
        tx,
        tenantId,
        write.linkedAccountId,
        appliedDeltaFor(write)
      )

      const placement = await this.statements.replaceInTx(
        tx,
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

      const [row] = await tx
        .update(transactions)
        .set({
          ...write,
          balanceOnDt: newBalance,
          statementId: placement.statementId,
          statementPinned: placement.statementPinned,
          updateBy: userId,
          updateDt: new Date(),
        })
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            eq(transactions.id, id),
            eq(transactions.status, 'ACTIVE')
          )
        )
        .returning()

      await this.recordHistory(tx, tenantId, id, userId, 'UPDATE', before, row)

      if (sibling !== undefined) {
        await this.updateTransferSibling(tx, tenantId, userId, sibling, write)
      }

      return withWarning(
        (await this.findByIdInTx(tx, tenantId, id)) as TransactionRow,
        placement
      )
    })
  }

  /**
   * Moves a card charge to another bill of the same card by hand and pins
   * it there: later date edits no longer re-resolve it (a merchant posted
   * late and the bank billed it a cycle on). On the card side of a payment
   * it re-points the bill the payment settles instead — a payment is on no
   * bill, so there is nothing to pin. The caller checked the bill belongs
   * to the row's card; the row is locked and its lifecycle checked here,
   * and the account is locked before the bill, in the ledger's order.
   * Answers `undefined` when the row or the bill is gone.
   */
  async moveToStatement(
    tenantId: number,
    id: number,
    userId: number,
    statementId: number
  ): Promise<TransactionRow | undefined> {
    return this.inLedgerTx(async (tx) => {
      const locked = await this.lockInTx(tx, tenantId, id)

      if (locked === undefined || locked.status === 'DELETED') {
        return undefined
      }

      await lockAccounts(tx, tenantId, [locked.linkedAccountId])

      const target = await this.statements.findForMoveInTx(
        tx,
        tenantId,
        statementId
      )

      if (
        target === undefined ||
        target.statement.accountId !== locked.linkedAccountId
      ) {
        return undefined
      }

      const payment = isPaymentRow(locked)
      const [row] = await tx
        .update(transactions)
        .set({
          ...(payment
            ? { paymentStatementId: statementId }
            : { statementId, statementPinned: true }),
          updateBy: userId,
          updateDt: new Date(),
        })
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            eq(transactions.id, id),
            eq(transactions.status, 'ACTIVE')
          )
        )
        .returning()

      await this.recordHistory(tx, tenantId, id, userId, 'UPDATE', locked, row)

      const moved = (await this.findByIdInTx(
        tx,
        tenantId,
        id
      )) as TransactionRow

      return payment
        ? moved
        : withWarning(moved, {
            statementId,
            statementPinned: true,
            closed: target.closed,
          })
    })
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
   * The row is locked `FOR UPDATE` and its lifecycle checked inside the
   * database transaction, as in `updateWithBalance`. The other side of a
   * transfer is mirrored in the same transaction, both deltas reverted or
   * re-applied together: flipping one side alone would move the pair's
   * money into one account and out of none.
   */
  async updateStatus(
    tenantId: number,
    id: number,
    userId: number,
    reviewStatus: TransactionStatus
  ): Promise<TransactionRow | undefined> {
    return this.inLedgerTx(async (tx) => {
      const locked = await this.lockInTx(tx, tenantId, id)

      if (locked === undefined || locked.status === 'DELETED') {
        return undefined
      }

      const before = (await this.findByIdInTx(
        tx,
        tenantId,
        id
      )) as TransactionRow
      const sibling = await this.findActiveSiblingInTx(tx, tenantId, before)

      await lockAccounts(tx, tenantId, [
        before.linkedAccountId,
        ...(sibling === undefined ? [] : [sibling.linkedAccountId]),
      ])

      await this.updateStatusInTx(tx, tenantId, userId, before, reviewStatus)

      if (sibling !== undefined) {
        await this.updateStatusInTx(tx, tenantId, userId, sibling, reviewStatus)
      }

      return this.findByIdInTx(tx, tenantId, id) as Promise<TransactionRow>
    })
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
    return this.inLedgerTx(async (tx) => {
      const locked = await this.lockInTx(tx, tenantId, id)

      if (locked === undefined) {
        return undefined
      }

      const before = (await this.findByIdInTx(
        tx,
        tenantId,
        id
      )) as TransactionRow

      if (before.status === 'DELETED') {
        return before
      }

      const sibling = await this.findActiveSiblingInTx(tx, tenantId, before)

      await lockAccounts(tx, tenantId, [
        before.linkedAccountId,
        ...(sibling === undefined ? [] : [sibling.linkedAccountId]),
      ])

      await this.softDeleteInTx(tx, tenantId, userId, before)

      if (sibling !== undefined) {
        await this.softDeleteInTx(tx, tenantId, userId, sibling)
      }

      return this.findByIdInTx(tx, tenantId, id)
    })
  }

  /**
   * Writes both sides of a transfer — an Expense on the source and an
   * Income on the destination — in one database transaction, so the money
   * never vanishes between two rows. Both rows carry the same
   * `transferGroupId`, the link every later write keeps the pair by. Both
   * accounts are locked in the global order first, so a transfer A→B racing
   * one B→A never deadlocks.
   *
   * A payment's bill is locked `FOR SHARE` after the accounts, in the
   * ledger's order, so a cycle resync cannot retire it mid-write. Answers
   * `undefined` when that bill is gone or belongs to another card.
   */
  async insertTransfer(
    tenantId: number,
    userId: number,
    write: TransferWrite
  ): Promise<[TransactionRow, TransactionRow] | undefined> {
    return this.inLedgerTx(async (tx) => {
      const transferGroupId = randomUUID()

      await lockAccounts(tx, tenantId, [write.fromAccountId, write.toAccountId])

      if (write.paymentStatementId !== null) {
        const target = await this.statements.findForMoveInTx(
          tx,
          tenantId,
          write.paymentStatementId
        )

        if (target?.statement.accountId !== write.toAccountId) {
          return undefined
        }
      }

      const from = await this.insertInTx(tx, tenantId, userId, {
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
      })

      const to = await this.insertInTx(tx, tenantId, userId, {
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
        ...(write.paymentStatementId === null
          ? {}
          : { paymentStatementId: write.paymentStatementId }),
      })

      return [from, to] as [TransactionRow, TransactionRow]
    })
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
          this.joinedColumns(sql<string>`${running.runningBalance}`)
        )
        .from(transactions)
        .innerJoin(running, eq(running.id, transactions.id))
        .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .leftJoin(receivers, eq(transactions.receiverId, receivers.id))
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

    return { rows, total: counted.value }
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
        incomes: sql<string>`coalesce(sum(case when ${transactions.type} = 'Income' then ${transactions.amount} else 0 end), 0)`,
        expenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'Expense' then ${transactions.amount} else 0 end), 0)`,
        creditExpenses: sql<string>`coalesce(sum(case when ${transactions.type} = 'Expense' and ${accounts.type} = 'Credit Card' then ${transactions.amount} else 0 end), 0)`,
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
          eq(transactions.isAdjustment, false)
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
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
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
          eq(transactions.isAdjustment, false)
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
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
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
          eq(transactions.isAdjustment, false)
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

  /**
   * The one insert path every write shares: read the account `FOR UPDATE`,
   * apply the delta, insert the row with the resulting balance stamped, and
   * record the CREATE history — all inside the caller's transaction. A row
   * created Canceled applies nothing and stamps the balance as it found it.
   * An installment lands on its offset bill, pinned.
   */
  async insertInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number | null,
    write: TransactionWrite
  ): Promise<TransactionRow> {
    const { installment, ...columns } = write
    const newBalance = await applyTransactionDelta(
      tx,
      tenantId,
      write.linkedAccountId,
      appliedDeltaFor(write)
    )

    // A card row lands on its bill in the same transaction, after the
    // account is locked — so recurring rules and transfers get bills too.
    const placement = await this.statements.placeInTx(
      tx,
      tenantId,
      userId,
      {
        linkedAccountId: write.linkedAccountId,
        transactionDt: write.transactionDt,
        type: write.type,
        isTransferLeg: write.transferGroupId !== undefined,
      },
      installment === undefined ? 0 : installment.number - 1
    )

    const [row] = await tx
      .insert(transactions)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...columns,
        balanceOnDt: newBalance,
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

    await this.recordHistory(tx, tenantId, row.id, userId, 'CREATE', null, row)

    return withWarning(
      (await this.findByIdInTx(tx, tenantId, row.id)) as TransactionRow,
      placement
    )
  }

  /** Records one append-only history row with the full snapshots. */
  async recordHistory(
    tx: DbOrTx,
    tenantId: number,
    transactionId: number,
    userId: number | null,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    before: Transaction | null,
    after: Transaction | null
  ): Promise<void> {
    await tx.insert(transactionHistory).values({
      tenantId,
      transactionId,
      action,
      before,
      after,
      createdBy: userId,
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

    return row
  }

  /** Reads the ACTIVE installments of one purchase with the joined names,
   * in order. */
  async findInstallments(
    tenantId: number,
    groupId: string,
    db: DbOrTx = this.db
  ): Promise<TransactionRow[]> {
    return this.selectJoined(db)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.installmentGroupId, groupId),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactions.installmentNumber))
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
      currency: accounts.currency,
      statementDueDate: creditCardStatements.dueDate,
      paymentStatementDueDate: paymentStatements.dueDate,
      runningBalance,
      locked: sql<boolean>`coalesce(${transactions.transactionDt} <= ${accounts.reconciledThrough}, false)`,
    }
  }

  /** The joined select the by-id reads share. The running balance is the
   * correlated single-row form; a page of rows joins the window instead
   * (`search`). */
  private selectJoined(db: DbOrTx) {
    return db
      .select(this.joinedColumns(this.balances.runningBalanceOfRowSql()))
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(receivers, eq(transactions.receiverId, receivers.id))
      .leftJoin(
        creditCardStatements,
        eq(transactions.statementId, creditCardStatements.id)
      )
      .leftJoin(
        paymentStatements,
        eq(transactions.paymentStatementId, paymentStatements.id)
      )
  }

  /**
   * Reads one row of the tenant locked `FOR UPDATE`, so two writes to the
   * same row serialize instead of both reading the same lifecycle status.
   * A transfer side locks its other side with it, both in id order: two
   * writes starting from opposite sides of one pair would otherwise each
   * hold one row while waiting for the other. The group id is read first
   * without a lock — it never changes once written.
   */
  private async lockInTx(
    tx: DbOrTx,
    tenantId: number,
    id: number
  ): Promise<Transaction | undefined> {
    const [target] = await tx
      .select({ transferGroupId: transactions.transferGroupId })
      .from(transactions)
      .where(and(eq(transactions.tenantId, tenantId), eq(transactions.id, id)))

    if (target === undefined) {
      return undefined
    }

    const rows = await tx
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          target.transferGroupId === null
            ? eq(transactions.id, id)
            : eq(transactions.transferGroupId, target.transferGroupId)
        )
      )
      .orderBy(asc(transactions.id))
      .for('update')

    return rows.find((row) => row.id === id)
  }

  /** Reads the ACTIVE other side of a transfer by the group id the pair
   * shares — nothing for a plain transaction or a side already deleted. */
  private async findActiveSiblingInTx(
    tx: DbOrTx,
    tenantId: number,
    row: Transaction
  ): Promise<Transaction | undefined> {
    if (row.transferGroupId === null) {
      return undefined
    }

    const [sibling] = await tx
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

  /**
   * Runs one ledger write in a database transaction of its own, retried
   * when Postgres aborts it for a deadlock or a serialization failure. The
   * ordered locks make those rare; the retry is the safety net.
   */
  inLedgerTx<T>(run: (tx: DbOrTx) => Promise<T>): Promise<T> {
    return retryOnLockConflict(() => this.db.transaction(run))
  }

  /** Writes one row's review status and moves its account by the difference
   * between the delta the new status applies and the one the old applied —
   * nonzero only into or out of Canceled. The caller holds the row and
   * account locks. */
  private async updateStatusInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    before: Transaction,
    reviewStatus: TransactionStatus
  ): Promise<void> {
    const shift = addMoney(
      appliedDeltaFor({ ...before, reviewStatus }),
      negateMoney(appliedDeltaFor(before))
    )

    if (!isZeroMoney(shift)) {
      await applyTransactionDelta(tx, tenantId, before.linkedAccountId, shift)
    }

    const [row] = await tx
      .update(transactions)
      .set({ reviewStatus, updateBy: userId, updateDt: new Date() })
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.id, before.id),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .returning()

    if (row !== undefined) {
      await this.recordHistory(
        tx,
        tenantId,
        before.id,
        userId,
        'UPDATE',
        before,
        row
      )
    }
  }

  /** Reverts one row's applied delta (none for a Canceled row), marks it
   * DELETED, and records the history — the body every soft delete shares.
   * The `where` re-checks the lifecycle so a row a concurrent write deleted
   * is left alone. */
  async softDeleteInTx(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    before: Transaction
  ): Promise<void> {
    await applyTransactionDelta(
      tx,
      tenantId,
      before.linkedAccountId,
      negateMoney(appliedDeltaFor(before))
    )

    const [row] = await tx
      .update(transactions)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.id, before.id),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .returning()

    if (row !== undefined) {
      await this.recordHistory(
        tx,
        tenantId,
        before.id,
        userId,
        'DELETE',
        before,
        null
      )
    }
  }

  /**
   * Keeps the other side of a transfer in step with an update of one side:
   * the fields the pair shares — amount, day, category, note, review
   * status — are mirrored, each side's own account and direction kept. The
   * mirrored amounts keep the books balanced: the money moved by the pair
   * stays the same both sides, and a Canceled pair moves none on either.
   * The caller holds the sibling's row and account locks.
   */
  private async updateTransferSibling(
    tx: DbOrTx,
    tenantId: number,
    userId: number,
    sibling: Transaction,
    write: TransactionWrite
  ): Promise<void> {
    await applyTransactionDelta(
      tx,
      tenantId,
      sibling.linkedAccountId,
      negateMoney(appliedDeltaFor(sibling))
    )

    const newBalance = await applyTransactionDelta(
      tx,
      tenantId,
      sibling.linkedAccountId,
      appliedDeltaFor({
        type: sibling.type,
        amount: write.amount,
        reviewStatus: write.reviewStatus,
      })
    )

    // The mirrored day may move a card side to another bill.
    const placement = await this.statements.replaceInTx(
      tx,
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

    const [row] = await tx
      .update(transactions)
      .set({
        amount: write.amount,
        transactionDt: write.transactionDt,
        categoryId: write.categoryId,
        note: write.note,
        reviewStatus: write.reviewStatus,
        statusNote: write.statusNote,
        balanceOnDt: newBalance,
        statementId: placement.statementId,
        statementPinned: placement.statementPinned,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.id, sibling.id),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .returning()

    if (row !== undefined) {
      await this.recordHistory(
        tx,
        tenantId,
        sibling.id,
        userId,
        'UPDATE',
        sibling,
        row
      )
    }
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

/** Answers whether a database error is the unique-index violation — the
 * signature two materializing replicas race over. */
function isUniqueViolation(error: unknown): boolean {
  const codes = [error, (error as { cause?: unknown } | null)?.cause]

  return codes.some(
    (candidate) => (candidate as { code?: string } | null)?.code === '23505'
  )
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
  row: TransactionRow,
  placement: StatementPlacement
): TransactionRow {
  return placement.closed ? { ...row, warning: STATEMENT_CLOSED } : row
}
