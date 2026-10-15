import { and, asc, count, eq } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Account, Database } from '@workspace/db'
import { accounts, transactions } from '@workspace/db'
import type { SearchAccountsArgs } from '@workspace/poco'

import { buildPagedQuery } from '../common/search/fetch.helper.js'

/** What a search answers with: the page's rows and how many match in all. */
export interface AccountSearch {
  rows: Account[]
  total: number
}

/** The fields a create or update writes, beyond the audit stamps. */
export interface AccountWrite {
  name: string
  agency: string | null
  number: number
  type: Account['type']
  balance: string
  currency: Account['currency']
  limit: string | null
  closeDay: number | null
  closeMonth: number | null
  dueDay: number | null
  dueMonth: number | null
}

/**
 * The account rows, reached only through the tenant of the session. Every
 * method takes the tenant id explicitly — the repository never decides who
 * is asking.
 */
@Injectable()
export class AccountRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Inserts an account, stamping the audit trail with the acting user. */
  async insert(
    tenantId: number,
    userId: number,
    data: AccountWrite
  ): Promise<Account> {
    const [row] = await this.db
      .insert(accounts)
      .values({
        tenantId,
        createdBy: userId,
        updateBy: userId,
        ...data,
      })
      .returning()

    return row
  }

  /** Runs the paged search a `FetchArgs` describes, over the tenant's rows. */
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
        // The id is the tie-breaker: rows the sort clauses leave equal keep
        // one order, so a page never shuffles its neighbors.
        .orderBy(...query.orderBy, asc(accounts.id))
        .limit(query.limit)
        .offset(query.offset),
      this.db.select({ value: count() }).from(accounts).where(query.where),
    ])

    return { rows, total: counted.value }
  }

  /** Reads one account of the tenant — deleted rows included. */
  async findById(tenantId: number, id: number): Promise<Account | undefined> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))

    return row
  }

  /** Updates an account's fields and audit trail. The written columns are
   * named one by one: the id is GENERATED ALWAYS and must never be in a SET. */
  async update(
    tenantId: number,
    id: number,
    userId: number,
    data: AccountWrite
  ): Promise<Account | undefined> {
    const [row] = await this.db
      .update(accounts)
      .set({
        name: data.name,
        agency: data.agency,
        number: data.number,
        type: data.type,
        balance: data.balance,
        currency: data.currency,
        limit: data.limit,
        closeDay: data.closeDay,
        closeMonth: data.closeMonth,
        dueDay: data.dueDay,
        dueMonth: data.dueMonth,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))
      .returning()

    return row
  }

  /** Soft-deletes an account: a status change, stamped like any update. */
  async softDelete(
    tenantId: number,
    id: number,
    userId: number
  ): Promise<Account | undefined> {
    const [row] = await this.db
      .update(accounts)
      .set({ status: 'DELETED', updateBy: userId, updateDt: new Date() })
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))
      .returning()

    return row
  }

  /** Answers whether the account carries any ACTIVE transaction — the
   * check that freezes an account's type once money moved through it. */
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

  /** Lists the tenant's ACTIVE accounts by name, for pickers. */
  async listActive(tenantId: number): Promise<Account[]> {
    return this.db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.tenantId, tenantId), eq(accounts.status, 'ACTIVE'))
      )
      .orderBy(accounts.name)
  }

  /** Translates the wire filter into SQL, always inside the tenant. */
  private filterToSql(tenantId: number, args: SearchAccountsArgs) {
    const conditions = [eq(accounts.tenantId, tenantId)]

    if (args.filter.type !== undefined) {
      conditions.push(eq(accounts.type, args.filter.type))
    }

    conditions.push(eq(accounts.status, args.filter.status))

    return and(...conditions)
  }
}
