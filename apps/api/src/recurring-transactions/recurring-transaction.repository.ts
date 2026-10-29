import { and, asc, count, eq, getTableColumns, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type { Currency, Database, RecurringTransaction } from '@workspace/db'
import {
  accounts,
  categories,
  receivers,
  recurringTransactions,
  users,
} from '@workspace/db'
import type {
  SearchRecurringTransactionsArgs,
  SplitInput,
} from '@workspace/poco'

import { buildPagedQuery } from '../common/search/fetch.helper.js'

/**
 * A recurring rule row with the receiver's, category's, and account's names
 * — and the account's currency, which the rule's amount is in — joined on:
 * what every read answers. The web never resolves an id into a label.
 */
export type RecurringTransactionRow = RecurringTransaction & {
  receiverName: string
  categoryName: string
  accountName: string
  accountCurrency: Currency
  /** The payer's name, joined; nothing for a rule with no payer. */
  paidByName: string | null
}

/** What a search answers with: the page's rows and how many match in all. */
export interface RecurringTransactionSearch {
  rows: RecurringTransactionRow[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface RecurringTransactionWrite {
  receiverId: number
  categoryId: number
  linkedAccountId: number
  amount: string
  type: RecurringTransaction['type']
  frequency: RecurringTransaction['frequency']
  frequencyDay: number | null
  frequencyMonth: number | null
  paidByUserId: number | null
  /** The shares generated transactions are split with; left out on an
   * update, the stored shares are kept, and null clears them. */
  defaultSplit?: SplitInput | null
}

/** The payer's user row, joined for the name. */
const payers = alias(users, 'payer')

/**
 * The recurring rule rows, reached only through the tenant of the session
 * — except the plain ACTIVE listing the materialization job reads. Every
 * read joins the three display names, so a client never has to resolve an
 * id.
 */
export class RecurringTransactionRepository {
  constructor(private readonly db: Database) {}

  /** Inserts a rule, stamping the audit trail with the acting user. */
  async insert(
    tenantId: number,
    userId: number,
    data: RecurringTransactionWrite
  ): Promise<RecurringTransactionRow> {
    const [row] = await this.db
      .insert(recurringTransactions)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
      })
      .returning()

    return this.withNames(row)
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
  async search(
    tenantId: number,
    args: SearchRecurringTransactionsArgs
  ): Promise<RecurringTransactionSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      amount: recurringTransactions.amount,
      frequency: recurringTransactions.frequency,
      receiverName: receivers.name,
      categoryName: categories.name,
      accountName: accounts.name,
      createdDt: recurringTransactions.createdDt,
      updateDt: recurringTransactions.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.selectJoined()
        .where(query.where)
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
        .orderBy(...query.orderBy, asc(recurringTransactions.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(recurringTransactions)
        .innerJoin(
          receivers,
          eq(recurringTransactions.receiverId, receivers.id)
        )
        .innerJoin(
          categories,
          eq(recurringTransactions.categoryId, categories.id)
        )
        .innerJoin(
          accounts,
          eq(recurringTransactions.linkedAccountId, accounts.id)
        )
        .where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Reads one rule of the tenant — deleted rows included. */
  async findById(
    tenantId: number,
    id: number
  ): Promise<RecurringTransactionRow | undefined> {
    const [row] = await this.selectJoined().where(
      and(
        eq(recurringTransactions.tenantId, tenantId),
        eq(recurringTransactions.id, id)
      )
    )

    return row
  }

  /** Updates a rule's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: RecurringTransactionWrite
  ): Promise<RecurringTransactionRow | undefined> {
    const [row] = await this.db
      .update(recurringTransactions)
      .set({
        receiverId: data.receiverId,
        categoryId: data.categoryId,
        linkedAccountId: data.linkedAccountId,
        amount: data.amount,
        type: data.type,
        frequency: data.frequency,
        frequencyDay: data.frequencyDay,
        frequencyMonth: data.frequencyMonth,
        paidByUserId: data.paidByUserId,
        ...(data.defaultSplit === undefined
          ? {}
          : { defaultSplit: data.defaultSplit }),
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(
        and(
          eq(recurringTransactions.tenantId, tenantId),
          eq(recurringTransactions.id, id)
        )
      )
      .returning()

    return row === undefined ? undefined : this.withNames(row)
  }

  /** Soft-deletes a rule: a status change, stamped like any update. */
  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<RecurringTransaction | undefined> {
    const [row] = await this.db
      .update(recurringTransactions)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(
        and(
          eq(recurringTransactions.tenantId, tenantId),
          eq(recurringTransactions.id, id)
        )
      )
      .returning()

    return row
  }

  /** Lists the tenant's ACTIVE rules of ACTIVE accounts, names joined —
   * what the upcoming list projects. */
  async listActive(tenantId: number): Promise<RecurringTransactionRow[]> {
    return this.selectJoined()
      .where(
        and(
          eq(recurringTransactions.tenantId, tenantId),
          eq(recurringTransactions.status, 'ACTIVE'),
          eq(accounts.status, 'ACTIVE')
        )
      )
      .orderBy(asc(recurringTransactions.id))
  }

  /** Lists the tenant's ACTIVE rules, plain — what the materialization
   * job iterates. No names joined: the run re-reads the one rule it
   * materializes for its receiver's name. */
  async listActiveRules(tenantId: number): Promise<RecurringTransaction[]> {
    return this.db
      .select()
      .from(recurringTransactions)
      .where(
        and(
          eq(recurringTransactions.tenantId, tenantId),
          eq(recurringTransactions.status, 'ACTIVE')
        )
      )
  }

  /** Re-reads one row with the joined names. */
  private async withNames(
    row: RecurringTransaction
  ): Promise<RecurringTransactionRow> {
    const found = await this.findById(row.tenantId, row.id)

    // The row was just written; the join cannot come back empty.
    return found as RecurringTransactionRow
  }

  /** The joined select every read shares. */
  private selectJoined() {
    return this.db
      .select({
        ...getTableColumns(recurringTransactions),
        receiverName: sql<string>`coalesce(${receivers.name}, '')`,
        categoryName: sql<string>`coalesce(${categories.name}, '')`,
        accountName: sql<string>`coalesce(${accounts.name}, '')`,
        accountCurrency: accounts.currency,
        paidByName: payers.name,
      })
      .from(recurringTransactions)
      .innerJoin(receivers, eq(recurringTransactions.receiverId, receivers.id))
      .innerJoin(
        categories,
        eq(recurringTransactions.categoryId, categories.id)
      )
      .innerJoin(
        accounts,
        eq(recurringTransactions.linkedAccountId, accounts.id)
      )
      .leftJoin(payers, eq(recurringTransactions.paidByUserId, payers.id))
  }

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchRecurringTransactionsArgs) {
    const conditions = [eq(recurringTransactions.tenantId, tenantId)]

    if (args.filter.categoryId !== undefined) {
      conditions.push(
        eq(recurringTransactions.categoryId, args.filter.categoryId)
      )
    }

    if (args.filter.receiverId !== undefined) {
      conditions.push(
        eq(recurringTransactions.receiverId, args.filter.receiverId)
      )
    }

    if (args.filter.linkedAccountId !== undefined) {
      conditions.push(
        eq(recurringTransactions.linkedAccountId, args.filter.linkedAccountId)
      )
    }

    if (args.filter.frequency !== undefined) {
      conditions.push(
        eq(recurringTransactions.frequency, args.filter.frequency)
      )
    }

    conditions.push(eq(recurringTransactions.status, args.filter.status))

    return and(...conditions)
  }
}
