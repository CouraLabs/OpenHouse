import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import type { Account, Database, DbOrTx } from '@workspace/db'
import { accounts, centsToDecimalSql, transactions } from '@workspace/db'
import { addMoney, compareMoney, negateMoney } from '@workspace/poco'
import type { BalanceDrift } from '@workspace/poco'
import type { SQL } from 'drizzle-orm'

import { appliedDeltaSql } from './balance-sql.js'

/**
 * The reads that derive a balance from the ledger: the sum of an account's
 * applied deltas, its end-of-day balances, and the running-balance window
 * the transaction search joins. `accounts.balance` stays the cached current
 * balance the ledger writes move; everything here recomputes it from the
 * rows, which is what the consistency check compares against.
 */
@Injectable()
export class BalanceRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * The running-balance window as a CTE of `(id, runningBalance)`: for every
   * row, the account's opening balance plus the applied deltas of every row
   * up to and including it in `(transactionDt, id)` order, per account.
   *
   * The window runs over the **whole account partition** — never over a
   * filtered set — so the caller can filter and page the transactions it
   * joins this to without the running sum skipping a row. `accountId` only
   * narrows which partitions are computed, never what is inside one.
   */
  runningBalanceCte(db: DbOrTx, tenantId: number, accountId?: number) {
    return db.$with('running_balances').as(
      db
        .select({
          id: transactions.id,
          // The window sums integer cents exactly; the caller formats the
          // materialized column into the two-decimal string.
          cents: sql<number>`(${accounts.openingBalance} + sum(${appliedDeltaSql}) over (
            partition by ${transactions.linkedAccountId}
            order by ${transactions.transactionDt}, ${transactions.id}
            rows unbounded preceding
          ))`.as('cents'),
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            ...(accountId === undefined
              ? []
              : [eq(transactions.linkedAccountId, accountId)])
          )
        )
    )
  }

  /**
   * One row's running balance as a correlated subquery — the single-row twin
   * of the window, for reads that fetch a handful of rows by id and would
   * waste the window's full-account pass. Same definition: the opening
   * balance plus every applied delta up to the row in `(transactionDt, id)`
   * order.
   */
  runningBalanceOfRowSql() {
    const earlier = sql`(select coalesce(sum(case
        when e.status = 'ACTIVE' and e.review_status <> 'Canceled'
        then case when e.type = 'Income' then e.amount else -e.amount end
        else 0
      end), 0)
      from transactions e
      where e.tenant_id = ${transactions.tenantId}
        and e.linked_account_id = ${transactions.linkedAccountId}
        and (e.transaction_dt, e.id) <= (${transactions.transactionDt}, ${transactions.id}))`

    return centsToDecimalSql(sql`(${accounts.openingBalance} + ${earlier})`)
  }

  /** Formats the running-balance CTE's materialized cents column. */
  formatRunningBalance(cents: SQL) {
    return centsToDecimalSql(cents)
  }

  /** The opening balance and currency of one account of the tenant. */
  async findAccount(
    tenantId: number,
    accountId: number
  ): Promise<
    { openingBalance: string; currency: Account['currency'] } | undefined
  > {
    const [row] = await this.db
      .select({
        openingBalance: accounts.openingBalance,
        currency: accounts.currency,
      })
      .from(accounts)
      .where(and(eq(accounts.tenantId, tenantId), eq(accounts.id, accountId)))

    return row
  }

  /** `openingBalance + sum(applied deltas)` of one account, from the rows. */
  async ledgerBalance(
    db: DbOrTx,
    tenantId: number,
    accountId: number,
    openingBalance: string
  ): Promise<string> {
    const [row] = await db
      .select({
        total: centsToDecimalSql(
          sql`coalesce(sum(${appliedDeltaSql}), 0)`
        ),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId)
        )
      )

    return addMoney(openingBalance, row.total)
  }

  /** `balanceThrough` on the repository's own connection. */
  async balanceOn(
    tenantId: number,
    accountId: number,
    openingBalance: string,
    date: string
  ): Promise<string> {
    return this.balanceThrough(
      this.db,
      tenantId,
      accountId,
      openingBalance,
      date
    )
  }

  /** The account's balance at the end of `date`: opening plus every applied
   * delta on or before it. */
  async balanceThrough(
    db: DbOrTx,
    tenantId: number,
    accountId: number,
    openingBalance: string,
    date: string
  ): Promise<string> {
    const [row] = await db
      .select({
        total: centsToDecimalSql(
          sql`coalesce(sum(${appliedDeltaSql}), 0)`
        ),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          lte(transactions.transactionDt, date)
        )
      )

    return addMoney(openingBalance, row.total)
  }

  /** The net applied delta per day of an account over `[from, to]`. Days
   * with no movement have no row. */
  async dailyDeltas(
    tenantId: number,
    accountId: number,
    from: string,
    to: string
  ): Promise<Array<{ date: string; delta: string }>> {
    return this.db
      .select({
        date: transactions.transactionDt,
        delta: centsToDecimalSql(sql`sum(${appliedDeltaSql})`),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          gte(transactions.transactionDt, from),
          lte(transactions.transactionDt, to)
        )
      )
      .groupBy(transactions.transactionDt)
      .orderBy(asc(transactions.transactionDt))
  }

  /** The applied delta of an account strictly before `date`. */
  async deltaBefore(
    tenantId: number,
    accountId: number,
    date: string
  ): Promise<string> {
    const [row] = await this.db
      .select({
        total: centsToDecimalSql(
          sql`coalesce(sum(${appliedDeltaSql}), 0)`
        ),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          sql`${transactions.transactionDt} < ${date}`
        )
      )

    return row.total
  }

  /**
   * Every ACTIVE account whose cached `balance` differs from `openingBalance`
   * plus the sum of its applied deltas — drift the ledger writes should make
   * impossible. `tenantId` narrows the check to one tenant; the nightly run
   * passes none and covers them all. Answers how many accounts were checked.
   */
  async findDrifts(
    tenantId?: number
  ): Promise<{ checked: number; drifts: Array<BalanceDrift & { tenantId: number }> }> {
    const rows = await this.db
      .select({
        tenantId: accounts.tenantId,
        accountId: accounts.id,
        name: accounts.name,
        balance: accounts.balance,
        expected: centsToDecimalSql(sql`(${accounts.openingBalance} + coalesce((
          select sum(case
            when t.status = 'ACTIVE' and t.review_status <> 'Canceled'
            then case when t.type = 'Income' then t.amount else -t.amount end
            else 0
          end)
          from transactions t
          where t.linked_account_id = "accounts"."id"
        ), 0))`),
      })
      .from(accounts)
      .where(
        and(
          eq(accounts.status, 'ACTIVE'),
          ...(tenantId === undefined ? [] : [eq(accounts.tenantId, tenantId)])
        )
      )

    const drifts = rows
      .filter((row) => compareMoney(row.balance, row.expected) !== 0)
      .map((row) => ({
        ...row,
        drift: addMoney(row.balance, negateMoney(row.expected)),
      }))

    return { checked: rows.length, drifts }
  }
}
