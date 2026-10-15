import { and, asc, count, eq, getTableColumns, sql } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Limit, Database } from '@workspace/db'
import { categories, limits } from '@workspace/db'
import type { SearchLimitsArgs } from '@workspace/poco'

import { buildPagedQuery } from '../common/search/fetch.helper.js'

/** A limit row with the category's name joined on — what every read answers. */
export type LimitRow = Limit & { categoryName: string }

/** What a search answers with: the page's rows and how many match in all. */
export interface LimitSearch {
  rows: LimitRow[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface LimitWrite {
  categoryId: number
  amount: string
  type: Limit['type']
  currency: Limit['currency']
}

/**
 * The limit rows, reached only through the tenant of the session. Every
 * method takes the tenant id explicitly — the repository never decides who
 * is asking. Every read joins the category's name, so a client never has to
 * resolve a `categoryId`, and the name survives a deleted category.
 */
@Injectable()
export class LimitRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Inserts a limit, stamping the audit trail with the acting user. */
  async insert(
    tenantId: number,
    userId: number,
    data: LimitWrite
  ): Promise<LimitRow> {
    const [row] = await this.db
      .insert(limits)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
      })
      .returning()

    return this.withCategoryName(row)
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
  async search(tenantId: number, args: SearchLimitsArgs): Promise<LimitSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      type: limits.type,
      amount: limits.amount,
      currency: limits.currency,
      categoryName: categories.name,
      createdDt: limits.createdDt,
      updateDt: limits.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(limits),
          // The FK guarantees the category exists, so the name cannot really
          // be null — coalesce only tells the types what the join cannot.
          categoryName: sql<string>`coalesce(${categories.name}, '')`,
        })
        .from(limits)
        .leftJoin(categories, eq(limits.categoryId, categories.id))
        .where(query.where)
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
        .orderBy(...query.orderBy, asc(limits.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(limits)
        .leftJoin(categories, eq(limits.categoryId, categories.id))
        .where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Reads one limit of the tenant — deleted rows included. */
  async findById(tenantId: number, id: number): Promise<LimitRow | undefined> {
    const [row] = await this.db
      .select({
        ...getTableColumns(limits),
        categoryName: sql<string>`coalesce(${categories.name}, '')`,
      })
      .from(limits)
      .leftJoin(categories, eq(limits.categoryId, categories.id))
      .where(and(eq(limits.tenantId, tenantId), eq(limits.id, id)))

    return row
  }

  /** Updates a limit's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: LimitWrite
  ): Promise<LimitRow | undefined> {
    const [row] = await this.db
      .update(limits)
      .set({
        categoryId: data.categoryId,
        amount: data.amount,
        type: data.type,
        currency: data.currency,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(limits.tenantId, tenantId), eq(limits.id, id)))
      .returning()

    return row === undefined ? undefined : this.withCategoryName(row)
  }

  /** Soft-deletes a limit: a status change, stamped like any update. */
  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Limit | undefined> {
    const [row] = await this.db
      .update(limits)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(and(eq(limits.tenantId, tenantId), eq(limits.id, id)))
      .returning()

    return row
  }

  /** Re-reads one row with its category name joined on. */
  private async withCategoryName(row: Limit): Promise<LimitRow> {
    const found = await this.findById(row.tenantId, row.id)

    // The row was just written; the join cannot come back empty.
    return found as LimitRow
  }

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchLimitsArgs) {
    const conditions = [eq(limits.tenantId, tenantId)]

    if (args.filter.categoryId !== undefined) {
      conditions.push(eq(limits.categoryId, args.filter.categoryId))
    }

    if (args.filter.type !== undefined) {
      conditions.push(eq(limits.type, args.filter.type))
    }

    if (args.filter.currency !== undefined) {
      conditions.push(eq(limits.currency, args.filter.currency))
    }

    conditions.push(eq(limits.status, args.filter.status))

    return and(...conditions)
  }
}
