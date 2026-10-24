import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  type SQL,
} from 'drizzle-orm'
import type { Database } from '@workspace/db'
import {
  accounts,
  categories,
  transactionSplits,
  transactions,
  users,
} from '@workspace/db'
import type {
  Currency,
  HouseholdMember,
  HouseholdOverviewArgs,
  LedgerEntry,
  SplitShare,
} from '@workspace/poco'

import { HouseholdMembers } from '../common/household/household-members.js'
import type { SpendingRow } from './household-spending.js'

/** One recorded settle-up, before the names are joined on. */
export interface SettlementRow {
  id: number
  transactionDt: string
  currency: Currency
  amount: string
  fromUserId: number
  toUserId: number
  note: string | null
}

/**
 * The household's reads: its members, and the expense rows balances,
 * spending, and the settlement history are derived from. Nothing here is
 * stored — a balance is computed from the transactions and their splits on
 * every read, so it cannot drift. Every method takes the tenant explicitly.
 * Also the implementation of the `HouseholdMembers` port.
 */
@Injectable()
export class HouseholdRepository extends HouseholdMembers {
  constructor(@InjectDrizzle() private readonly db: Database) {
    super()
  }

  /** Lists the tenant's members — removed ones included, since their
   * balance stays visible — oldest first. */
  async listMembers(tenantId: number): Promise<HouseholdMember[]> {
    return this.db
      .select({ id: users.id, name: users.name, isActive: users.isActive })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.createdAt), asc(users.id))
  }

  async activeMemberIds(tenantId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.id))

    return rows.map((row) => row.id)
  }

  async allMemberIds(tenantId: number): Promise<number[]> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(asc(users.id))

    return rows.map((row) => row.id)
  }

  async nameOf(tenantId: number, userId: number): Promise<string | undefined> {
    const [row] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))

    return row?.name
  }

  async ownerId(tenantId: number): Promise<number | undefined> {
    const [row] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'owner')))

    return row?.id
  }

  /**
   * The entries balances are computed from: expenses somebody paid, on a
   * personal account, not canceled — plus the settlements, which move a
   * debt whatever account paid them. A shared account's expenses create no
   * debts; transfers, adjustments, and deleted rows never count.
   */
  async balanceEntries(tenantId: number): Promise<LedgerEntry[]> {
    const where = and(
      eq(transactions.tenantId, tenantId),
      eq(transactions.status, 'ACTIVE'),
      ne(transactions.reviewStatus, 'Canceled'),
      eq(transactions.type, 'Expense'),
      isNotNull(transactions.paidByUserId),
      or(
        eq(transactions.isSettlement, true),
        and(
          isNull(transactions.transferGroupId),
          eq(transactions.isAdjustment, false),
          eq(accounts.ownership, 'personal')
        )
      )
    )

    const rows = await this.db
      .select({
        id: transactions.id,
        payerUserId: transactions.paidByUserId,
        currency: accounts.currency,
        amount: transactions.amount,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .where(where)

    const shares = await this.sharesOf(
      tenantId,
      rows.map((row) => row.id)
    )

    return rows.map((row) => ({
      payerUserId: row.payerUserId,
      currency: row.currency,
      amount: row.amount,
      shares: shares.get(row.id) ?? [],
    }))
  }

  /** The expenses of a window the spending report totals: every real
   * expense, shared accounts included, never settlements or transfers. */
  async spendingRows(
    tenantId: number,
    range: HouseholdOverviewArgs
  ): Promise<SpendingRow[]> {
    const conditions: SQL[] = [
      eq(transactions.tenantId, tenantId),
      eq(transactions.status, 'ACTIVE'),
      ne(transactions.reviewStatus, 'Canceled'),
      eq(transactions.type, 'Expense'),
      isNull(transactions.transferGroupId),
      eq(transactions.isAdjustment, false),
      eq(transactions.isSettlement, false),
    ]

    if (range.transactionDtFrom !== undefined) {
      conditions.push(gte(transactions.transactionDt, range.transactionDtFrom))
    }

    if (range.transactionDtTo !== undefined) {
      conditions.push(lte(transactions.transactionDt, range.transactionDtTo))
    }

    const rows = await this.db
      .select({
        id: transactions.id,
        payerUserId: transactions.paidByUserId,
        currency: accounts.currency,
        amount: transactions.amount,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .innerJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))

    const shares = await this.sharesOf(
      tenantId,
      rows.map((row) => row.id)
    )

    return rows.map(({ id, ...row }) => ({
      ...row,
      shares: shares.get(id) ?? [],
    }))
  }

  /** The recorded settle-ups, newest first: the paying leg of each, with
   * the member it paid read from its one share. */
  async settlements(tenantId: number): Promise<SettlementRow[]> {
    const rows = await this.db
      .select({
        id: transactions.id,
        transactionDt: transactions.transactionDt,
        currency: accounts.currency,
        amount: transactions.amount,
        fromUserId: transactions.paidByUserId,
        note: transactions.note,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.linkedAccountId, accounts.id))
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.status, 'ACTIVE'),
          ne(transactions.reviewStatus, 'Canceled'),
          eq(transactions.type, 'Expense'),
          eq(transactions.isSettlement, true),
          isNotNull(transactions.paidByUserId)
        )
      )
      .orderBy(desc(transactions.transactionDt), desc(transactions.id))

    const shares = await this.sharesOf(
      tenantId,
      rows.map((row) => row.id)
    )

    return rows.flatMap((row) => {
      const receiver = shares.get(row.id)?.[0]

      return row.fromUserId === null || receiver === undefined
        ? []
        : [
            {
              id: row.id,
              transactionDt: row.transactionDt,
              currency: row.currency,
              amount: row.amount,
              fromUserId: row.fromUserId,
              toUserId: receiver.userId,
              note: row.note,
            },
          ]
    })
  }

  /** The ACTIVE shares of the given transactions, grouped by transaction. */
  private async sharesOf(
    tenantId: number,
    transactionIds: readonly number[]
  ): Promise<Map<number, SplitShare[]>> {
    const grouped = new Map<number, SplitShare[]>()

    for (let start = 0; start < transactionIds.length; start += 5000) {
      const rows = await this.db
        .select({
          transactionId: transactionSplits.transactionId,
          userId: transactionSplits.userId,
          share: transactionSplits.share,
        })
        .from(transactionSplits)
        .where(
          and(
            eq(transactionSplits.tenantId, tenantId),
            eq(transactionSplits.status, 'ACTIVE'),
            inArray(
              transactionSplits.transactionId,
              transactionIds.slice(start, start + 5000)
            )
          )
        )

      for (const row of rows) {
        const list = grouped.get(row.transactionId) ?? []

        list.push({ userId: row.userId, share: row.share })
        grouped.set(row.transactionId, list)
      }
    }

    return grouped
  }
}
