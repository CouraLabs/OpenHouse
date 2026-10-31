import { and, eq, sql, type SQL } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { Database } from '../database.js'
import { decimalToCents } from '../money.js'
import { accounts } from '../schema.js'
import { LedgerConflictError } from './ledger-conflict.js'

export type LedgerStatement = BatchItem<'sqlite'>

export interface GuardedStatement {
  statement: LedgerStatement
  what: string
  expect: number
}

export class LedgerBatchPlan {
  private readonly items: GuardedStatement[] = []

  guarded(statement: LedgerStatement, expect: number, what: string): this {
    this.items.push({ statement, expect, what })
    return this
  }

  add(statement: LedgerStatement): this {
    this.items.push({ statement, expect: -1, what: '' })
    return this
  }

  addNullable(statement: LedgerStatement | null): this {
    return statement === null ? this : this.add(statement)
  }

  append(plan: LedgerBatchPlan): this {
    for (const item of plan.items) {
      this.items.push(item)
    }

    return this
  }

  get statements(): LedgerStatement[] {
    return this.items.map((item) => item.statement)
  }

  get size(): number {
    return this.items.length
  }

  async run(db: Database): Promise<unknown[]> {
    if (this.items.length === 0) {
      return []
    }

    const results = (await db.batch(this.statements as never)) as unknown[]

    for (const [index, item] of this.items.entries()) {
      if (item.expect < 0) {
        continue
      }

      const changes = changesOf(results[index])

      if (changes !== item.expect) {
        throw new LedgerConflictError(
          new Error(
            `The ${item.what} matched ${changes} rows, expected ${item.expect}.`
          )
        )
      }
    }

    return results
  }
}

export function balanceDeltaStatement(
  db: Database,
  tenantId: number,
  accountId: number,
  delta: string
): LedgerStatement {
  return db
    .update(accounts)
    .set({ balance: sql`${accounts.balance} + ${decimalToCents(delta)}` })
    .where(
      and(
        eq(accounts.tenantId, tenantId),
        eq(accounts.id, accountId),
        eq(accounts.status, 'ACTIVE')
      )
    )
}

export function balanceSubselect(accountId: number): SQL {
  return sql`(select balance from accounts where id = ${accountId})`
}

let lastStampMs = 0

export function stampFor(read?: { updateDt: Date } | null): Date {
  const now = Date.now()
  lastStampMs = now > lastStampMs ? now : lastStampMs + 1

  const stampMs =
    read !== undefined &&
    read !== null &&
    read.updateDt.getTime() === lastStampMs
      ? lastStampMs + 1
      : lastStampMs

  if (stampMs > lastStampMs) {
    lastStampMs = stampMs
  }

  return new Date(stampMs)
}

export function changesOf(result: unknown): number {
  if (Array.isArray(result)) {
    return result.length
  }

  const meta = (result as { meta?: { changes?: number } } | null)?.meta

  return typeof meta?.changes === 'number' ? meta.changes : 0
}

export async function runBatch(
  db: Database,
  statements: LedgerStatement[]
): Promise<unknown[]> {
  if (statements.length === 0) {
    return []
  }

  return db.batch(statements as never) as Promise<unknown[]>
}
