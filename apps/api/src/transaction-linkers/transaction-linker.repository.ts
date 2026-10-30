import { and, asc, count, eq, getTableColumns, like, sql } from 'drizzle-orm'
import type { Database, TransactionLinker } from '@workspace/db'
import { categories, normalizeSearchName, receivers, transactionLinkers } from '@workspace/db'
import type { SearchTransactionLinkersArgs } from '@workspace/poco'

import { buildPagedQuery, likePattern } from '../common/search/fetch.helper.js'

export type TransactionLinkerRow = TransactionLinker & {
  categoryName: string
  receiverName: string | null
}

export interface TransactionLinkerSearch {
  rows: TransactionLinkerRow[]
  total: number
}

export interface TransactionLinkerWrite {
  description: string
  categoryId: number
  receiverId: number | null
}

export class TransactionLinkerRepository {
  constructor(private readonly db: Database) {}

  async insert(
    tenantId: number,
    userId: number,
    data: TransactionLinkerWrite
  ): Promise<TransactionLinkerRow> {
    const [row] = await this.db
      .insert(transactionLinkers)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
        searchName: normalizeSearchName(data.description),
      })
      .returning()

    return this.withNames(row)
  }

  async search(
    tenantId: number,
    args: SearchTransactionLinkersArgs
  ): Promise<TransactionLinkerSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      description: transactionLinkers.description,
      categoryName: categories.name,
      receiverName: receivers.name,
      createdDt: transactionLinkers.createdDt,
      updateDt: transactionLinkers.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(transactionLinkers),
          categoryName: sql<string>`coalesce(${categories.name}, '')`,
          receiverName: receivers.name,
        })
        .from(transactionLinkers)
        .leftJoin(categories, eq(transactionLinkers.categoryId, categories.id))
        .leftJoin(receivers, eq(transactionLinkers.receiverId, receivers.id))
        .where(query.where)
        .orderBy(...query.orderBy, asc(transactionLinkers.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(transactionLinkers)
        .leftJoin(categories, eq(transactionLinkers.categoryId, categories.id))
        .leftJoin(receivers, eq(transactionLinkers.receiverId, receivers.id))
        .where(query.where),
    ])

    return { rows, total: counted.value }
  }

  async listActive(tenantId: number): Promise<TransactionLinker[]> {
    return this.db
      .select()
      .from(transactionLinkers)
      .where(
        and(
          eq(transactionLinkers.tenantId, tenantId),
          eq(transactionLinkers.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactionLinkers.id))
  }

  async findById(
    tenantId: number,
    id: number
  ): Promise<TransactionLinkerRow | undefined> {
    const [row] = await this.db
      .select({
        ...getTableColumns(transactionLinkers),
        categoryName: sql<string>`coalesce(${categories.name}, '')`,
        receiverName: receivers.name,
      })
      .from(transactionLinkers)
      .leftJoin(categories, eq(transactionLinkers.categoryId, categories.id))
      .leftJoin(receivers, eq(transactionLinkers.receiverId, receivers.id))
      .where(
        and(
          eq(transactionLinkers.tenantId, tenantId),
          eq(transactionLinkers.id, id)
        )
      )

    return row
  }

  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: TransactionLinkerWrite
  ): Promise<TransactionLinkerRow | undefined> {
    const [row] = await this.db
      .update(transactionLinkers)
      .set({
        description: data.description,
        searchName: normalizeSearchName(data.description),
        categoryId: data.categoryId,
        receiverId: data.receiverId,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(
        and(
          eq(transactionLinkers.tenantId, tenantId),
          eq(transactionLinkers.id, id)
        )
      )
      .returning()

    return row === undefined ? undefined : this.withNames(row)
  }

  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<TransactionLinker | undefined> {
    const [row] = await this.db
      .update(transactionLinkers)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(
        and(
          eq(transactionLinkers.tenantId, tenantId),
          eq(transactionLinkers.id, id)
        )
      )
      .returning()

    return row
  }

  private async withNames(
    row: TransactionLinker
  ): Promise<TransactionLinkerRow> {
    const found = await this.findById(row.tenantId, row.id)

    return found as TransactionLinkerRow
  }

  private filterToSql(tenantId: number, args: SearchTransactionLinkersArgs) {
    const conditions = [eq(transactionLinkers.tenantId, tenantId)]

    if (args.filter.description !== undefined) {
      conditions.push(
        like(transactionLinkers.searchName, likePattern(args.filter.description))
      )
    }

    if (args.filter.categoryId !== undefined) {
      conditions.push(eq(transactionLinkers.categoryId, args.filter.categoryId))
    }

    if (args.filter.receiverId !== undefined) {
      conditions.push(eq(transactionLinkers.receiverId, args.filter.receiverId))
    }

    conditions.push(eq(transactionLinkers.status, args.filter.status))

    return and(...conditions)
  }
}
