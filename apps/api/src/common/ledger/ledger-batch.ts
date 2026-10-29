import { and, eq, sql, type SQL } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import { accounts, decimalToCents, type Database } from '@workspace/db'

import { LedgerConflictError } from './ledger-conflict.js'

/** A statement in a ledger batch, as Drizzle builds it. */
export type LedgerStatement = BatchItem<'sqlite'>

/**
 * One statement of a ledger batch, with the invariant it must uphold.
 *
 * D1 has no interactive transactions: a write is a `db.batch([...])` whose
 * statements were all built before it was sent, and the invariants the old
 * row locks checked become `WHERE` guards on the statements plus a check
 * that the affected-row count is what the guard expects. A miss throws
 * `LedgerConflictError`, which the API answers 409.
 */
export interface GuardedStatement {
  statement: LedgerStatement
  /** What the statement's guard promises, for the error message. */
  what: string
  /** The affected-row count the guard must answer — 1 for a guarded
   * single-row write, −1 for statements allowed to be no-ops. */
  expect: number
}

/**
 * The plan of one ledger write: the statements, in order, and the guards to
 * verify once the batch answers. Every ledger write — a transaction insert,
 * a transfer, an import chunk, a tenant deletion — builds one of these and
 * runs it once; there is no read-decide-write inside it.
 */
export class LedgerBatchPlan {
  private readonly items: GuardedStatement[] = []

  /** Appends a statement whose affected-row count must equal `expect`. */
  guarded(statement: LedgerStatement, expect: number, what: string): this {
    this.items.push({ statement, expect, what })
    return this
  }

  /** Appends a statement that may affect no rows and needs no count check
   * (an insert of an optional row, a gated history record). */
  add(statement: LedgerStatement): this {
    this.items.push({ statement, expect: -1, what: '' })
    return this
  }

  /** The same, for a builder that answers nothing when there is nothing to
   * write (an audit stamp for a bill that is still open). */
  addNullable(statement: LedgerStatement | null): this {
    return statement === null ? this : this.add(statement)
  }

  /** Appends every statement of another plan, in its order, checks
   * included — the way a multi-row write composes per-row groups. */
  append(plan: LedgerBatchPlan): this {
    for (const item of plan.items) {
      this.items.push(item)
    }

    return this
  }

  get statements(): LedgerStatement[] {
    return this.items.map((item) => item.statement)
  }

  /** How many statements the plan holds so far — the index the next
   * appended statement's result will sit at. */
  get size(): number {
    return this.items.length
  }

  /**
   * Sends the batch and checks every guard. The batch is atomic: a failed
   * guard throws after the fact, but every statement in it is rolled back
   * with it — D1 runs a batch in one implicit transaction.
   */
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

/**
 * The guarded, **relative** balance move: `balance = balance + delta`
 * against one account of the tenant, requiring it to exist and be ACTIVE.
 * Two concurrent writes to one account both apply — D1 serializes them, and
 * the relative form never recomputes from a stale read. The caller checks
 * the affected-row count (1) — a miss is a guard failure, answered 409.
 */
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

/**
 * The balance a transaction row stamps, read at write time: the account's
 * balance **after** the batch's guarded delta applied — a subselect the
 * batch runs after the update, inside the same transaction.
 */
export function balanceSubselect(accountId: number): SQL {
  return sql`(select balance from accounts where id = ${accountId})`
}

/**
 * The newest stamp this isolate has answered. Monotonic even inside one
 * millisecond: a second stamp in the same ms moves one forward, so two
 * runs (or two writes of one row) can never share a value — the property
 * the optimistic `update_dt` guards and the gated entries rely on.
 */
let lastStampMs = 0

/**
 * The audit stamp a write uses: now — moved one millisecond past the value
 * the writer read from the row it is about to guard on, and past every
 * stamp this isolate answered before — so a second write of the same row
 * never stamps the value its own optimistic guard matches on, and the
 * next writer's guard can always tell the two writes apart.
 */
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

/**
 * Reads the affected-row count a batch's per-statement result carries —
 * either the `meta.changes` of a `run`-shaped statement or the length of a
 * `returning` one's rows — the count the guards are checked against.
 */
export function changesOf(result: unknown): number {
  if (Array.isArray(result)) {
    return result.length
  }

  const meta = (result as { meta?: { changes?: number } } | null)?.meta

  return typeof meta?.changes === 'number' ? meta.changes : 0
}

/**
 * Sends statements that were built at runtime — where Drizzle's `batch`
 * wants a compile-time tuple. An empty list is a no-op that answers no
 * results.
 */
export async function runBatch(
  db: Database,
  statements: LedgerStatement[]
): Promise<unknown[]> {
  if (statements.length === 0) {
    return []
  }

  return db.batch(statements as never) as Promise<unknown[]>
}
