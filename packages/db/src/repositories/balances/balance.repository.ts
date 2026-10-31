import { and, asc, eq, gte, lt, lte, sql, type SQL } from 'drizzle-orm'
import type { TransactionStatus, TransactionType } from '@workspace/domain'
import type { Database, DbOrTx } from '../../database.js'
import { centsToDecimalSql } from '../../money-sql.js'
import { appliedDeltaSql } from '../../query/balance-sql.js'
import { accounts, transactions, type Account } from '../../schema.js'

export interface AmountTotal {
  type: TransactionType
  reviewStatus: TransactionStatus
  total: string
}

export interface CachedBalance {
  tenantId: number
  accountId: number
  name: string
  balance: string
  openingBalance: string
}

export class BalanceRepository {
  constructor(private readonly db: Database) {}

  runningBalanceCte(db: DbOrTx, tenantId: number, accountId?: number) {
    return db.$with('running_balances').as(
      db
        .select({
          id: transactions.id,
          cents:
            sql<number>`(${accounts.openingBalance} + sum(${appliedDeltaSql}) over (
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

  async amountTotals(
    tenantId: number,
    accountId: number,
    range: { through?: string; before?: string } = {}
  ): Promise<AmountTotal[]> {
    return this.db
      .select({
        type: transactions.type,
        reviewStatus: transactions.reviewStatus,
        total: centsToDecimalSql(sql`sum(${transactions.amount})`),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          eq(transactions.status, 'ACTIVE'),
          range.through === undefined
            ? undefined
            : lte(transactions.transactionDt, range.through),
          range.before === undefined
            ? undefined
            : lt(transactions.transactionDt, range.before)
        )
      )
      .groupBy(transactions.type, transactions.reviewStatus)
  }

  async dailyAmountTotals(
    tenantId: number,
    accountId: number,
    from: string,
    to: string
  ): Promise<Array<AmountTotal & { date: string }>> {
    return this.db
      .select({
        date: transactions.transactionDt,
        type: transactions.type,
        reviewStatus: transactions.reviewStatus,
        total: centsToDecimalSql(sql`sum(${transactions.amount})`),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          eq(transactions.status, 'ACTIVE'),
          gte(transactions.transactionDt, from),
          lte(transactions.transactionDt, to)
        )
      )
      .groupBy(
        transactions.transactionDt,
        transactions.type,
        transactions.reviewStatus
      )
      .orderBy(asc(transactions.transactionDt))
  }

  async listAccountTotals(tenantId?: number): Promise<{
    accounts: CachedBalance[]
    totals: Array<AmountTotal & { accountId: number }>
  }> {
    const scope =
      tenantId === undefined ? undefined : eq(accounts.tenantId, tenantId)
    const [rows, totals] = await Promise.all([
      this.db
        .select({
          tenantId: accounts.tenantId,
          accountId: accounts.id,
          name: accounts.name,
          balance: accounts.balance,
          openingBalance: accounts.openingBalance,
        })
        .from(accounts)
        .where(and(eq(accounts.status, 'ACTIVE'), scope))
        .orderBy(asc(accounts.id)),
      this.db
        .select({
          accountId: transactions.linkedAccountId,
          type: transactions.type,
          reviewStatus: transactions.reviewStatus,
          total: centsToDecimalSql(sql`sum(${transactions.amount})`),
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
        .where(
          and(
            eq(transactions.status, 'ACTIVE'),
            eq(accounts.status, 'ACTIVE'),
            scope
          )
        )
        .groupBy(
          transactions.linkedAccountId,
          transactions.type,
          transactions.reviewStatus
        ),
    ])

    return { accounts: rows, totals }
  }
}
