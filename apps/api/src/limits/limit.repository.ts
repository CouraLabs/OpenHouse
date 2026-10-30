import { and, asc, count, eq, getTableColumns, sql } from 'drizzle-orm'
import type { Limit, Database } from '@workspace/db'
import { categories, limits } from '@workspace/db'
import type { SearchLimitsArgs } from '@workspace/poco'

import { buildPagedQuery } from '../common/search/fetch.helper.js'

export type LimitRow = Limit & { categoryName: string }

export interface LimitSearch {
  rows: LimitRow[]
  total: number
}

export interface LimitWrite {
  categoryId: number
  amount: string
  type: Limit['type']
}

export class LimitRepository {
  constructor(private readonly db: Database) {}

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

  async search(tenantId: number, args: SearchLimitsArgs): Promise<LimitSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      type: limits.type,
      amount: limits.amount,
      categoryName: categories.name,
      createdDt: limits.createdDt,
      updateDt: limits.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(limits),
          categoryName: sql<string>`coalesce(${categories.name}, '')`,
        })
        .from(limits)
        .leftJoin(categories, eq(limits.categoryId, categories.id))
        .where(query.where)
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

  async listActive(tenantId: number): Promise<LimitRow[]> {
    return this.db
      .select({
        ...getTableColumns(limits),
        categoryName: sql<string>`coalesce(${categories.name}, '')`,
      })
      .from(limits)
      .leftJoin(categories, eq(limits.categoryId, categories.id))
      .where(and(eq(limits.tenantId, tenantId), eq(limits.status, 'ACTIVE')))
      .orderBy(asc(limits.id))
  }

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
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(limits.tenantId, tenantId), eq(limits.id, id)))
      .returning()

    return row === undefined ? undefined : this.withCategoryName(row)
  }

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

  private async withCategoryName(row: Limit): Promise<LimitRow> {
    const found = await this.findById(row.tenantId, row.id)

    return found as LimitRow
  }

  private filterToSql(tenantId: number, args: SearchLimitsArgs) {
    const conditions = [eq(limits.tenantId, tenantId)]

    if (args.filter.categoryId !== undefined) {
      conditions.push(eq(limits.categoryId, args.filter.categoryId))
    }

    if (args.filter.type !== undefined) {
      conditions.push(eq(limits.type, args.filter.type))
    }

    conditions.push(eq(limits.status, args.filter.status))

    return and(...conditions)
  }
}
