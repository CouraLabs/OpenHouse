import { and, asc, count, eq, getTableColumns, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import type {
  Currency,
  SearchRecurringTransactionsArgs,
  SplitInput,
} from '@workspace/domain'
import type { Database } from '../../database.js'
import { buildPagedQuery } from '../../query/paged-query.js'
import {
  accounts,
  categories,
  receivers,
  recurringTransactions,
  users,
  type RecurringTransaction,
} from '../../schema.js'

export type RecurringTransactionRow = RecurringTransaction & {
  receiverName: string
  categoryName: string
  accountName: string
  accountCurrency: Currency
  paidByName: string | null
}

export interface RecurringTransactionSearch {
  rows: RecurringTransactionRow[]
  total: number
}

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
  defaultSplit?: SplitInput | null
}

const payers = alias(users, 'payer')

export class RecurringTransactionRepository {
  constructor(private readonly db: Database) {}

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

  private async withNames(
    row: RecurringTransaction
  ): Promise<RecurringTransactionRow> {
    const found = await this.findById(row.tenantId, row.id)

    return found as RecurringTransactionRow
  }

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
