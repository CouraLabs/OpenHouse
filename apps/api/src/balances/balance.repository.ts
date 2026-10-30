import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'
import type { Account, Database, DbOrTx } from '@workspace/db'
import { accounts, centsToDecimalSql, transactions } from '@workspace/db'
import { addMoney, compareMoney, negateMoney } from '@workspace/poco'
import type { BalanceDrift } from '@workspace/poco'
import type { SQL } from 'drizzle-orm'

import { appliedDeltaSql } from './balance-sql.js'

export class BalanceRepository {
  constructor(private readonly db: Database) {}

  runningBalanceCte(db: DbOrTx, tenantId: number, accountId?: number) {
    return db.$with('running_balances').as(
      db
        .select({
          id: transactions.id,
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

  formatRunningBalance(cents: SQL) {
    return centsToDecimalSql(cents)
  }

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
