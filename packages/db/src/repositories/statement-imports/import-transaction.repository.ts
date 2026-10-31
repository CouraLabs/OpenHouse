import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import type { TransactionType } from '@workspace/domain'
import type { Database } from '../../database.js'
import { transactions, type Transaction } from '../../schema.js'

export interface ExistingRow {
  id: number
  name: string
  transactionDt: string
  amount: string
  type: TransactionType
}

export interface BatchSummary {
  batchId: string
  count: number
  importedAt: Date
}

const LOOKUP_CHUNK = 1000

export class ImportTransactionRepository {
  constructor(private readonly db: Database) {}

  async findByExternalIds(
    tenantId: number,
    accountId: number,
    externalIds: readonly string[]
  ): Promise<Map<string, ExistingRow>> {
    const found = new Map<string, ExistingRow>()

    for (let start = 0; start < externalIds.length; start += LOOKUP_CHUNK) {
      const rows = await this.db
        .select({
          id: transactions.id,
          name: transactions.name,
          transactionDt: transactions.transactionDt,
          amount: transactions.amount,
          type: transactions.type,
          externalId: transactions.externalId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, tenantId),
            eq(transactions.linkedAccountId, accountId),
            eq(transactions.status, 'ACTIVE'),
            inArray(
              transactions.externalId,
              externalIds.slice(start, start + LOOKUP_CHUNK)
            )
          )
        )

      for (const { externalId, ...row } of rows) {
        if (externalId !== null) {
          found.set(externalId, row)
        }
      }
    }

    return found
  }

  async findInWindow(
    tenantId: number,
    accountId: number,
    from: string,
    to: string
  ): Promise<ExistingRow[]> {
    return this.db
      .select({
        id: transactions.id,
        name: transactions.name,
        transactionDt: transactions.transactionDt,
        amount: transactions.amount,
        type: transactions.type,
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
  }

  async findBatch(
    tenantId: number,
    batchId: string
  ): Promise<{ rows: Transaction[]; importedAt: Date } | undefined> {
    const [stamp] = await this.db
      .select({ importedAt: sql<number>`min(${transactions.createdDt})` })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.importBatchId, batchId)
        )
      )

    if (stamp?.importedAt == null) {
      return undefined
    }

    const rows = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.importBatchId, batchId),
          eq(transactions.status, 'ACTIVE')
        )
      )
      .orderBy(asc(transactions.id))

    return { rows, importedAt: new Date(stamp.importedAt) }
  }

  async accountsOfBatch(
    tenantId: number,
    batchId: string
  ): Promise<number[]> {
    const rows = await this.db
      .selectDistinct({ accountId: transactions.linkedAccountId })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.importBatchId, batchId)
        )
      )

    return rows.map((row) => row.accountId)
  }

  async recentBatches(
    tenantId: number,
    accountId: number,
    since: Date
  ): Promise<BatchSummary[]> {
    const imported = sql<Date>`min(${transactions.createdDt})`
    const rows = await this.db
      .select({
        batchId: sql<string>`${transactions.importBatchId}`,
        count: sql<number>`count(*) filter (where ${transactions.status} = 'ACTIVE')`,
        importedAt: imported,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.linkedAccountId, accountId),
          sql`${transactions.importBatchId} is not null`
        )
      )
      .groupBy(transactions.importBatchId)
      .having(
        sql`min(${transactions.createdDt}) >= ${since.getTime()} and count(*) filter (where ${transactions.status} = 'ACTIVE') > 0`
      )
      .orderBy(sql`min(${transactions.createdDt}) desc`)

    return rows.map((row) => ({
      ...row,
      importedAt: new Date(row.importedAt),
    }))
  }
}
