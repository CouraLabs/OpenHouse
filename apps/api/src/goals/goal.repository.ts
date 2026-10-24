import { and, asc, count, eq, getTableColumns } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Currency, Database, Goal } from '@workspace/db'
import { accounts, goals } from '@workspace/db'
import type { SearchGoalsArgs } from '@workspace/poco'

import { buildPagedQuery } from '../common/search/fetch.helper.js'

/** A goal row with the linked account's name and currency joined on — what
 * every read answers. */
export type GoalRow = Goal & { accountName: string; accountCurrency: Currency }

/** The linked account's columns every read joins on. The FK guarantees the
 * account exists — deleting one is soft — so the join is inner. */
const ACCOUNT_COLUMNS = {
  accountName: accounts.name,
  accountCurrency: accounts.currency,
}

/** What a search answers with: the page's rows and how many match in all. */
export interface GoalSearch {
  rows: GoalRow[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface GoalWrite {
  name: string
  linkedAccountId: number
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
}

/**
 * The goal rows, reached only through the tenant of the session. Every
 * method takes the tenant id explicitly — the repository never decides who
 * is asking. Every read joins the linked account's name, so a client never
 * has to resolve a `linkedAccountId`, and the name survives a deleted
 * account.
 */
@Injectable()
export class GoalRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Inserts a goal, stamping the audit trail with the acting user. */
  async insert(
    tenantId: number,
    userId: number,
    data: GoalWrite
  ): Promise<GoalRow> {
    const [row] = await this.db
      .insert(goals)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
      })
      .returning()

    return this.withAccountName(row)
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
  async search(tenantId: number, args: SearchGoalsArgs): Promise<GoalSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      name: goals.name,
      balance: goals.balance,
      targetBalance: goals.targetBalance,
      balanceDt: goals.balanceDt,
      targetDt: goals.targetDt,
      accountName: accounts.name,
      createdDt: goals.createdDt,
      updateDt: goals.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select({
          ...getTableColumns(goals),
          ...ACCOUNT_COLUMNS,
        })
        .from(goals)
        .innerJoin(accounts, eq(goals.linkedAccountId, accounts.id))
        .where(query.where)
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
        .orderBy(...query.orderBy, asc(goals.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db
        .select({ value: count() })
        .from(goals)
        .innerJoin(accounts, eq(goals.linkedAccountId, accounts.id))
        .where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Lists the tenant's ACTIVE goals of ACTIVE accounts, with the balance
   * the linked account holds now. */
  async listActiveWithBalance(
    tenantId: number
  ): Promise<Array<GoalRow & { accountBalance: string }>> {
    return this.db
      .select({
        ...getTableColumns(goals),
        ...ACCOUNT_COLUMNS,
        accountBalance: accounts.balance,
      })
      .from(goals)
      .innerJoin(accounts, eq(goals.linkedAccountId, accounts.id))
      .where(
        and(
          eq(goals.tenantId, tenantId),
          eq(goals.status, 'ACTIVE'),
          eq(accounts.status, 'ACTIVE')
        )
      )
      .orderBy(asc(goals.id))
  }

  /** Reads one goal of the tenant — deleted rows included. */
  async findById(tenantId: number, id: number): Promise<GoalRow | undefined> {
    const [row] = await this.db
      .select({
        ...getTableColumns(goals),
        ...ACCOUNT_COLUMNS,
      })
      .from(goals)
      .innerJoin(accounts, eq(goals.linkedAccountId, accounts.id))
      .where(and(eq(goals.tenantId, tenantId), eq(goals.id, id)))

    return row
  }

  /** Updates a goal's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: GoalWrite
  ): Promise<GoalRow | undefined> {
    const [row] = await this.db
      .update(goals)
      .set({
        name: data.name,
        linkedAccountId: data.linkedAccountId,
        balance: data.balance,
        balanceDt: data.balanceDt,
        targetBalance: data.targetBalance,
        targetDt: data.targetDt,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(goals.tenantId, tenantId), eq(goals.id, id)))
      .returning()

    return row === undefined ? undefined : this.withAccountName(row)
  }

  /** Soft-deletes a goal: a status change, stamped like any update. */
  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Goal | undefined> {
    const [row] = await this.db
      .update(goals)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(and(eq(goals.tenantId, tenantId), eq(goals.id, id)))
      .returning()

    return row
  }

  /** Re-reads one row with its account name joined on. */
  private async withAccountName(row: Goal): Promise<GoalRow> {
    const found = await this.findById(row.tenantId, row.id)

    // The row was just written; the join cannot come back empty.
    return found as GoalRow
  }

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchGoalsArgs) {
    const conditions = [eq(goals.tenantId, tenantId)]

    if (args.filter.linkedAccountId !== undefined) {
      conditions.push(eq(goals.linkedAccountId, args.filter.linkedAccountId))
    }

    conditions.push(eq(goals.status, args.filter.status))

    return and(...conditions)
  }
}
