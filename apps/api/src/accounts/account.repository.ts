import { and, asc, count, eq, ne, sql } from 'drizzle-orm'
import type { Account, Database } from '@workspace/db'
import { accounts, decimalToCents, transactions } from '@workspace/db'
import type { SearchAccountsArgs } from '@workspace/poco'

import {
  LedgerBatchPlan,
  stampFor,
} from '../common/ledger/ledger-batch.js'

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
  number: string | null
  type: Account['type']
  /** The opening balance: on create the account starts at it, on update the
   * cached balance is recomputed from it plus the account's transactions. */
  openingBalance: string
  /** The day the opening balance is stated for; the database's today when
   * absent on create, unchanged when absent on update. */
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

/**
 * The account rows, reached only through the tenant of the session. Every
 * method takes the tenant id explicitly — the repository never decides who
 * is asking.
 */
export class AccountRepository {
  constructor(private readonly db: Database) {}

  /**
   * Inserts an account, stamping the audit trail with the acting user. A
   * default account takes the flag from the previous holder first, so the
   * tenant never holds two defaults — both writes in one batch, under the
   * one-default unique index.
   */
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
          // A new account has no rows yet: it holds exactly what it opens at.
          balance: data.openingBalance,
        })
        .returning()
    )

    const results = await plan.run(this.db)
    const [row] = results.at(-1) as Account[]

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

  /**
   * Updates an account's fields and audit trail. The written columns are
   * named one by one: the id is generated and must never be in a SET.
   * A default account takes the flag from the previous holder first, so the
   * tenant never holds two defaults — both writes in one batch, under the
   * one-default unique index.
   *
   * `resyncPlan` holds the statements a card's bills follow its new days
   * with (the `CardCycleSync` port), so the days and the bills commit
   * together. The row is written under an optimistic `update_dt` guard, so
   * an edit racing this one answers 409 instead of being overwritten.
   */
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

    // Editing the opening balance moves the current one by the same
    // amount: the cached balance is rebuilt from the ledger **inside the
    // write**, as a subselect over the account's rows, so the two never
    // disagree — a transaction landing before the batch is already counted.
    plan.guarded(
      this.db
        .update(accounts)
        .set({
          name: data.name,
          agency: data.agency,
          number: data.number,
          type: data.type,
          openingBalance: data.openingBalance,
          ...(data.openingDt === undefined ? {} : { openingDt: data.openingDt }),
          balance: sql`(${decimalToCents(data.openingBalance)} + coalesce((select sum(case
              when t.status = 'ACTIVE' and t.review_status <> 'Canceled'
              then case when t.type = 'Income' then t.amount else -t.amount end
              else 0
            end) from transactions t where t.linked_account_id = ${id}), 0))`,
          currency: data.currency,
          // Editable at any time, unlike the currency: the spread only
          // affects future conversions; the audit stamps record the change.
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

  /**
   * Soft-deletes an account: a status change, stamped like any update. A
   * deleted account is no account's default — the flag goes with it, so
   * the tenant is free to raise another.
   */
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

  /** Stamps the day the account was reconciled through — never moving it
   * backwards — and answers the stored day. */
  async stampReconciledThrough(
    tenantId: number,
    id: number,
    userId: number,
    date: string
  ): Promise<string | null> {
    const [row] = await this.db
      .update(accounts)
      .set({
        // Never moves backwards: coalesce around SQLite's scalar max,
        // which returns NULL when either argument is NULL.
        reconciledThrough: sql`coalesce(max(${accounts.reconciledThrough}, ${date}), ${date})`,
        updateBy: userId,
        updateDt: new Date(),
      })
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, id)))
      .returning({ reconciledThrough: accounts.reconciledThrough })

    return row?.reconciledThrough ?? null
  }

  /** Clears the default flag from every account of the tenant but `keepId`
   * — the step that keeps the one-default promise before a write sets it. */
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
