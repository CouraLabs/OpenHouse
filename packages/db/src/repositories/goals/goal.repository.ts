import { and, asc, count, eq, getTableColumns } from 'drizzle-orm'
import type { Currency, SearchGoalsArgs } from '@workspace/domain'
import type { Database } from '../../database.js'
import { buildPagedQuery } from '../../query/paged-query.js'
import { accounts, goals, type Goal } from '../../schema.js'

export type GoalRow = Goal & {
  accountName: string
  accountCurrency: Currency
  accountBalance: string
}

const ACCOUNT_COLUMNS = {
  accountName: accounts.name,
  accountCurrency: accounts.currency,
  accountBalance: accounts.balance,
}

export interface GoalSearch {
  rows: GoalRow[]
  total: number
}

export interface GoalWrite {
  name: string
  linkedAccountId: number
  balance: string
  balanceDt: string
  targetBalance: string
  targetDt: string | null
}

export class GoalRepository {
  constructor(private readonly db: Database) {}

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

  async listActiveWithBalance(
    tenantId: number
  ): Promise<GoalRow[]> {
    return this.db
      .select({
        ...getTableColumns(goals),
        ...ACCOUNT_COLUMNS,
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

  private async withAccountName(row: Goal): Promise<GoalRow> {
    const found = await this.findById(row.tenantId, row.id)

    return found as GoalRow
  }

  private filterToSql(tenantId: number, args: SearchGoalsArgs) {
    const conditions = [eq(goals.tenantId, tenantId)]

    if (args.filter.linkedAccountId !== undefined) {
      conditions.push(eq(goals.linkedAccountId, args.filter.linkedAccountId))
    }

    conditions.push(eq(goals.status, args.filter.status))

    return and(...conditions)
  }
}
