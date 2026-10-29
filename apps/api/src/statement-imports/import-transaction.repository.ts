import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import type { Database, Transaction } from '@workspace/db'
import { transactions } from '@workspace/db'

import type { ExistingRow } from './import-duplicates.js'

/** A recent import batch with its live row count. */
export interface BatchSummary {
  batchId: string
  count: number
  importedAt: Date
}

/** The size of one `IN (...)` list when looking up bank ids. */
const LOOKUP_CHUNK = 1000

/**
 * The reads a statement import makes over the tenant's transactions: which
 * bank ids an account already holds, which rows could repeat an imported one,
 * and the rows of one import batch. The writes go through the transactions
 * feature's ledger repository, never around it.
 */
export class ImportTransactionRepository {
  constructor(private readonly db: Database) {}

  /** The ACTIVE rows of an account holding any of these bank ids, by id. */
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

  /** The ACTIVE rows of an account dated within a window — the pool a
   * probable duplicate is searched in. */
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

  /**
   * Reads the ACTIVE rows of one batch, in id order. Also answers when the
   * batch was written (its earliest row, deleted ones included) so the
   * caller can enforce the undo window; `undefined` for a batch that never
   * existed in the tenant. The rows the undo soft-deletes are guarded
   * optimistically per row, so a row edited since the read fails the batch
   * instead of being overwritten.
   */
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

  /** The account ids of one batch's rows, ACTIVE or not. */
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

  /** The account's batches written since `since` that still hold a live
   * row, newest first. */
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
