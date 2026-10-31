import { and, asc, count, eq, ne, sql } from 'drizzle-orm'
import type { SearchAccountsArgs } from '@workspace/domain'
import type { Database } from '../../database.js'
import { LedgerBatchPlan, stampFor } from '../../ledger/ledger-batch.js'
import { decimalToCents } from '../../money.js'
import { buildPagedQuery } from '../../query/paged-query.js'
import { accounts, transactions, type Account } from '../../schema.js'

export interface AccountSearch {
  rows: Account[]
  total: number
}

export interface AccountWrite {
  name: string
  agency: string | null
  number: string | null
  type: Account['type']
  openingBalance: string
  openingDt?: string
  currency: Account['currency']
  spreadPct: string
  limit: string | null
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  isDefault: boolean
  ownership: Account['ownership']
}

export class AccountRepository {
  constructor(private readonly db: Database) {}

  async insert(
    tenantId: number,
    userId: number,
    data: AccountWrite
  ): Promise<Account> {
    const plan = new LedgerBatchPlan()

    if (data.isDefault) {
      plan.add(this.clearDefaultStatement(this.db, tenantId, null))
    }

    const stamp = new Date()

    plan.add(
      this.db
        .insert(accounts)
        .values({
          tenantId,
          createdBy: userId,
          createdDt: stamp,
          updateBy: userId,
          updateDt: stamp,
          ...data,
          balance: data.openingBalance,
        })
        .returning()
    )

    const results = await plan.run(this.db)
    const [row] = results.at(-1) as Account[]

    return row
  }

  async search(
    tenantId: number,
    args: SearchAccountsArgs
  ): Promise<AccountSearch> {
    const query = buildPagedQuery(args, this.filterToSql(tenantId, args), {
      name: accounts.name,
      agency: accounts.agency,
      number: accounts.number,
      type: accounts.type,
      balance: accounts.balance,
      currency: accounts.currency,
      limit: accounts.limit,
      createdDt: accounts.createdDt,
      updateDt: accounts.updateDt,
    })

    const [rows, [counted]] = await Promise.all([
      this.db
        .select()
        .from(accounts)
        .where(query.where)
        .orderBy(...query.orderBy, asc(accounts.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(accounts).where(query.where),
    ])

    return { rows, total: counted.value }
  }

  async findById(tenantId: number, id: number): Promise<Account | undefined> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))

    return row
  }

  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: AccountWrite,
    resyncPlan?: LedgerBatchPlan
  ): Promise<Account | undefined> {
    const [current] = await this.db
      .select({ updateDt: accounts.updateDt })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))

    if (current === undefined) {
      return undefined
    }

    const plan = new LedgerBatchPlan()

    if (resyncPlan !== undefined) {
      plan.append(resyncPlan)
    }

    if (data.isDefault) {
      plan.add(this.clearDefaultStatement(this.db, tenantId, id))
    }

    plan.guarded(
      this.db
        .update(accounts)
        .set({
          name: data.name,
          agency: data.agency,
          number: data.number,
          type: data.type,
          openingBalance: data.openingBalance,
          ...(data.openingDt === undefined
            ? {}
            : { openingDt: data.openingDt }),
          balance: sql`(${decimalToCents(data.openingBalance)} + coalesce((select sum(case
              when t.status = 'ACTIVE' and t.review_status <> 'Canceled'
              then case when t.type = 'Income' then t.amount else -t.amount end
              else 0
            end) from transactions t where t.linked_account_id = ${id}), 0))`,
          currency: data.currency,
          spreadPct: data.spreadPct,
          limit: data.limit,
          closeDay: data.closeDay,
          dueDay: data.dueDay,
          closeDayInclusive: data.closeDayInclusive,
          isDefault: data.isDefault,
          ownership: data.ownership,
          updateBy: userId,
          updateDt: stampFor(current),
        })
        .where(
          and(
            eq(accounts.tenantId, tenantId),
            eq(accounts.id, id),
            eq(accounts.updateDt, current.updateDt)
          )
        )
        .returning(),
      1,
      'the account row (optimistic concurrency)'
    )

    await plan.run(this.db)

    return this.findById(tenantId, id)
  }

  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Account | undefined> {
    const [row] = await this.db
      .update(accounts)
      .set({
        status: 'DELETED',
        isDefault: false,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))
      .returning()

    return row
  }

  async stampReconciledThrough(
    tenantId: number,
    id: number,
    userId: number,
    date: string
  ): Promise<string | null> {
    const [row] = await this.db
      .update(accounts)
      .set({
        reconciledThrough: sql`coalesce(max(${accounts.reconciledThrough}, ${date}), ${date})`,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))
      .returning({ reconciledThrough: accounts.reconciledThrough })

    return row?.reconciledThrough ?? null
  }

  private clearDefaultStatement(
    db: Database,
    tenantId: number,
    keepId: number | null
  ) {
    const conditions = [
      eq(accounts.tenantId, tenantId),
      eq(accounts.isDefault, true),
    ]

    if (keepId !== null) {
      conditions.push(ne(accounts.id, keepId))
    }

    return db
      .update(accounts)
      .set({ isDefault: false })
      .where(and(...conditions))
  }

  async hasTransactions(tenantId: number, id: number): Promise<boolean> {
    const [counted] = await this.db
      .select({ value: count() })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, id),
          eq(transactions.status, 'ACTIVE')
        )
      )

    return counted.value > 0
  }

  async listActive(tenantId: number): Promise<Account[]> {
    return this.db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.tenantId, tenantId), eq(accounts.status, 'ACTIVE'))
      )
      .orderBy(accounts.name)
  }

  private filterToSql(tenantId: number, args: SearchAccountsArgs) {
    const conditions = [eq(accounts.tenantId, tenantId)]

    if (args.filter.type !== undefined) {
      conditions.push(eq(accounts.type, args.filter.type))
    }

    conditions.push(eq(accounts.status, args.filter.status))

    return and(...conditions)
  }
}
