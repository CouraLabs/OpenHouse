import { and, asc, count, eq, like, sql } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Category, Database } from '@workspace/db'
import { categories, normalizeSearchName } from '@workspace/db'
import type { SearchCategoriesArgs, SplitInput } from '@workspace/poco'

import { buildPagedQuery, likePattern } from '../common/search/fetch.helper.js'

/** What a search answers with: the page's rows and how many match in all. */
export interface CategorySearch {
  rows: Category[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface CategoryWrite {
  name: string
  color: string
  /** The split new expenses start with, or null for none. Left out on an
   * update, the stored split is kept. */
  defaultSplit?: SplitInput | null
}

/**
 * The category rows, reached only through the tenant of the session. Every
 * method takes the tenant id explicitly — the repository never decides who
 * is asking.
 */
@Injectable()
export class CategoryRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Inserts a category, stamping the audit trail with the acting user. */
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

  /**
   * Answers the tenant's ACTIVE category with this name (case-insensitive),
   * creating it the first time. `ON CONFLICT DO NOTHING` against the
   * partial unique name index makes it race-safe: a concurrent creator makes
   * this insert wait and then yield, and the follow-up select reads the row
   * it committed.
   */
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

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
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
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
        .orderBy(...query.orderBy, asc(categories.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(categories).where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Lists the tenant's ACTIVE categories by name — what pickers read. */
  async listActive(tenantId: number): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.tenantId, tenantId), eq(categories.status, 'ACTIVE'))
      )
      .orderBy(categories.name)
  }

  /** Reads one category of the tenant — deleted rows included. */
  async findById(tenantId: number, id: number): Promise<Category | undefined> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.id, id)))

    return row
  }

  /** Counts the tenant's ACTIVE categories named `name`, skipping `exceptId`. */
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

  /** Updates a category's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
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

  /** Soft-deletes a category: a status change, stamped like any update. */
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

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchCategoriesArgs) {
    const conditions = [eq(categories.tenantId, tenantId)]

    if (args.filter.name !== undefined) {
      conditions.push(like(categories.searchName, likePattern(args.filter.name)))
    }

    conditions.push(eq(categories.status, args.filter.status))

    return and(...conditions)
  }
}
