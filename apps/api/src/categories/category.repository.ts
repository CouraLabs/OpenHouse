import { and, asc, count, eq, like, sql } from 'drizzle-orm'
import type { Category, Database } from '@workspace/db'
import { categories, normalizeSearchName } from '@workspace/db'
import type { SearchCategoriesArgs, SplitInput } from '@workspace/poco'

import { buildPagedQuery, likePattern } from '../common/search/fetch.helper.js'

export interface CategorySearch {
  rows: Category[]
  total: number
}

export interface CategoryWrite {
  name: string
  color: string
  defaultSplit?: SplitInput | null
}

export class CategoryRepository {
  constructor(private readonly db: Database) {}

  async insert(
    tenantId: number,
    userId: number,
    data: CategoryWrite
  ): Promise<Category> {
    const [row] = await this.db
      .insert(categories)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
        searchName: normalizeSearchName(data.name),
      })
      .returning()

    return row
  }

  async getOrCreateByName(
    tenantId: number,
    userId: number,
    data: CategoryWrite
  ): Promise<Category> {
    const [created] = await this.db
      .insert(categories)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
        searchName: normalizeSearchName(data.name),
      })
      .onConflictDoNothing()
      .returning()

    if (created !== undefined) {
      return created
    }

    const [existing] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, tenantId),
          eq(categories.status, 'ACTIVE'),
          eq(categories.searchName, normalizeSearchName(data.name))
        )
      )

    return existing
  }

  async search(
    tenantId: number,
    args: SearchCategoriesArgs
  ): Promise<CategorySearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      name: categories.name,
      createdDt: categories.createdDt,
      updateDt: categories.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(categories)
        .where(query.where)
        .orderBy(...query.orderBy, asc(categories.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(categories).where(query.where),
    ])

    return { rows, total: counted.value }
  }

  async listActive(tenantId: number): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.tenantId, tenantId), eq(categories.status, 'ACTIVE'))
      )
      .orderBy(categories.name)
  }

  async findById(tenantId: number, id: number): Promise<Category | undefined> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))

    return row
  }

  async countActiveByName(
    tenantId: number,
    name: string,
    exceptId?: number
  ): Promise<number> {
    const conditions = [
      eq(categories.tenantId, tenantId),
      eq(categories.status, 'ACTIVE'),
      eq(categories.searchName, normalizeSearchName(name)),
    ]

    if (exceptId !== undefined) {
      conditions.push(sql`${categories.id} <> ${exceptId}`)
    }

    const [counted] = await this.db
      .select({ value: count() })
      .from(categories)
      .where(and(...conditions))

    return counted.value
  }

  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: CategoryWrite
  ): Promise<Category | undefined> {
    const [row] = await this.db
      .update(categories)
      .set({
        name: data.name,
        searchName: normalizeSearchName(data.name),
        color: data.color,
        ...(data.defaultSplit === undefined
          ? {}
          : { defaultSplit: data.defaultSplit }),
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))
      .returning()

    return row
  }

  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Category | undefined> {
    const [row] = await this.db
      .update(categories)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))
      .returning()

    return row
  }

  private filterToSql(tenantId: number, args: SearchCategoriesArgs) {
    const conditions = [eq(categories.tenantId, tenantId)]

    if (args.filter.name !== undefined) {
      conditions.push(like(categories.searchName, likePattern(args.filter.name)))
    }

    conditions.push(eq(categories.status, args.filter.status))

    return and(...conditions)
  }
}
