import { and, asc, count, eq, getTableColumns, ilike, sql } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Database, TransactionLinker } from '@workspace/db'
import { categories, receivers, transactionLinkers } from '@workspace/db'
import type { SearchTransactionLinkersArgs } from '@workspace/poco'

import {
  buildPagedQuery,
  escapeLikePattern,
} from '../common/search/fetch.helper.js'

/**
 * A linker row with the category's and the receiver's names joined on —
 * what every read answers. The receiver name is a left join: a linker may
 * not fix a receiver at all.
 */
export type TransactionLinkerRow = TransactionLinker & {
  categoryName: string
  receiverName: string | null
}

/** What a search answers with: the page's rows and how many match in all. */
export interface TransactionLinkerSearch {
  rows: TransactionLinkerRow[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface TransactionLinkerWrite {
  description: string
  categoryId: number
  receiverId: number | null
}

/**
 * The transaction linker rows, reached only through the tenant of the
 * session. Every method takes the tenant id explicitly — the repository
 * never decides who is asking. Every read joins the category's and the
 * receiver's names, so a client never has to resolve an id, and the names
 * survive a deleted row.
 */
@Injectable()
export class TransactionLinkerRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Inserts a linker, stamping the audit trail with the acting user. */
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
      })
      .returning()

    return this.withNames(row)
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
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
          // The FK guarantees the category exists, so the name cannot really
          // be null — coalesce only tells the types what the join cannot.
          categoryName: sql<string>`coalesce(${categories.name}, '')`,
          // The receiver may genuinely be unset, so this one stays nullable.
          receiverName: receivers.name,
        })
        .from(transactionLinkers)
        .leftJoin(categories, eq(transactionLinkers.categoryId, categories.id))
        .leftJoin(receivers, eq(transactionLinkers.receiverId, receivers.id))
        .where(query.where)
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
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

  /** Lists the tenant's ACTIVE linkers, oldest first — what the statement
   * import matches a row's description against. */
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

  /** Reads one linker of the tenant — deleted rows included. */
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

  /** Updates a linker's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
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

  /** Soft-deletes a linker: a status change, stamped like any update. */
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

  /** Re-reads one row with the joined names. */
  private async withNames(
    row: TransactionLinker
  ): Promise<TransactionLinkerRow> {
    const found = await this.findById(row.tenantId, row.id)

    // The row was just written; the join cannot come back empty.
    return found as TransactionLinkerRow
  }

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchTransactionLinkersArgs) {
    const conditions = [eq(transactionLinkers.tenantId, tenantId)]

    if (args.filter.description !== undefined) {
      conditions.push(
        ilike(
          transactionLinkers.description,
          `%${escapeLikePattern(args.filter.description)}%`
        )
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
