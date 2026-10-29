import {
  and,
  eq,
  getTableColumns,
  sql,
  type SQL,
} from 'drizzle-orm'
import type { Database, Transaction, TransactionHistoryAction } from '@workspace/db'
import { centsToDecimalSql } from '@workspace/db'
import { transactionHistory, transactions } from '@workspace/db'

import type { LedgerStatement } from './ledger-batch.js'

/**
 * The audited write of a transaction row: the guarded write of the row and
 * its append-only `transaction_history` entry, as statements of the same
 * batch. The history entry is **gated in SQL** on the write it records —
 * its `WHERE` re-checks the stamp the write set — so a guarded write that
 * matched no rows records nothing, exactly as the row locks once
 * guaranteed, and the entry commits or rolls back with the row.
 *
 * The snapshots keep the JSON shape the Postgres write path stored: money
 * as two-decimal strings, timestamps as ISO strings, booleans as
 * `true`/`false`. The `before` side is built in TypeScript — every value
 * of the read row is known; the `after` side is read back by the history
 * statement itself, because a relative balance move leaves the written
 * balance known only to the database.
 */

/** The history JSON of a row the write read — built where it is read. */
function snapshotOfRow(row: Transaction | null): string | null {
  return row === null ? null : JSON.stringify(row)
}

/**
 * The snapshot of a transactions row **as SQL**: a `json_object` over every
 * column, converting each kind back to the JSON shape the wire carries.
 * Evaluated against a single-table select (`FROM transactions`), which is
 * the only shape the gated history reads.
 */
const SNAPSHOT_PAIRS: SQL[] = Object.entries(
  getTableColumns(transactions)
).flatMap(([key, column]): SQL[] => {
  const ref = sql`${sql.identifier(column.name)}`

  switch (column.columnType) {
    // Money: integer cents, formatted as the two-decimal string.
    case 'SQLiteCustomColumn':
      return [sql`${key}`, centsToDecimalSql(ref)]
    // Timestamps: milliseconds, formatted as the ISO string JSON.stringify
    // of a Date produces.
    case 'SQLiteTimestamp':
      return [
        sql`${key}`,
        sql`strftime('%Y-%m-%dT%H:%M:%S', ${ref} / 1000, 'unixepoch') || printf('.%03dZ', ${ref} % 1000)`,
      ]
    // Booleans: 0/1 in storage, true/false in the JSON.
    case 'SQLiteBoolean':
      return [
        sql`${key}`,
        sql`case when ${ref} = 1 then json('true') else json('false') end`,
      ]
    // JSON documents: stored as text, embedded as JSON.
    case 'SQLiteTextJson':
      return [sql`${key}`, sql`json(${ref})`]
    default:
      return [sql`${key}`, ref]
  }
})

/** Reads one row's snapshot as JSON, by the predicate that names it. */
function snapshotSubselect(predicate: SQL): SQL {
  return sql`(select json_object(${sql.join(SNAPSHOT_PAIRS, sql`, `)}) from ${transactions} where ${predicate})`
}

/**
 * The two statements of an audited update or soft delete: the guarded
 * write of the row, then the history entry gated on the stamp the write
 * set. The caller adds the update with an affected-row guard of 1 — a miss
 * is the concurrent write the guard exists for, and the whole batch rolls
 * back with it — and the history right after it.
 */
export function auditedUpdateStatements(
  db: Database,
  args: {
    tenantId: number
    id: number
    userId: number | null
    /** The row as it was read — the optimistic guard and the `before`
     * snapshot both come from it. */
    before: Transaction
    /** The columns the write sets, `updateDt` included. */
    set: Record<string, unknown>
    /** Extra guards beyond the tenant, the id, the ACTIVE status, and the
     * optimistic `update_dt`. */
    extraGuards?: SQL[]
    action: 'UPDATE' | 'DELETE'
  }
): { update: LedgerStatement; history: LedgerStatement } {
  const stamp = args.set.updateDt as Date

  const update = db
    .update(transactions)
    .set(args.set)
    .where(
      and(
        eq(transactions.tenantId, args.tenantId),
        eq(transactions.id, args.id),
        eq(transactions.status, 'ACTIVE'),
        eq(transactions.updateDt, args.before.updateDt),
        ...(args.extraGuards ?? [])
      )
    )
    .returning()

  const history = gatedHistory(db, {
    tenantId: args.tenantId,
    transactionId: args.id,
    userId: args.userId,
    action: args.action,
    before: args.before,
    afterStamp: args.action === 'UPDATE' ? stamp : null,
    gate: sql`exists (select 1 from ${transactions} where ${transactions.id} = ${args.id} and ${transactions.updateDt} = ${stamp.getTime()})`,
    now: stamp,
  })

  return { update, history }
}

/**
 * The history entry of a row a batch just inserted: the row is named by
 * the newest id of the tenant — the id the batch's insert just generated,
 * still the newest inside the single-writer batch — and the entry carries
 * the row as written, read back by the snapshot.
 */
export function createdRowHistoryStatement(
  db: Database,
  args: {
    tenantId: number
    userId: number | null
    stamp: Date
  }
): LedgerStatement {
  const newestId = sql`(select max(${transactions.id}) from ${transactions} where ${transactions.tenantId} = ${args.tenantId})`

  return gatedHistory(db, {
    tenantId: args.tenantId,
    transactionId: newestId,
    userId: args.userId,
    action: 'CREATE',
    before: null,
    afterStamp: args.stamp,
    gate: sql`exists (select 1 from ${transactions} where ${transactions.id} = ${newestId} and ${transactions.updateDt} = ${args.stamp.getTime()})`,
    now: args.stamp,
  })
}

/**
 * One history entry as an `INSERT … SELECT` gated on `gate`: no gate, no
 * entry — the write it records did not happen. The `before` snapshot rides
 * from TypeScript, the `after` one from the gated snapshot read.
 */
function gatedHistory(
  db: Database,
  args: {
    tenantId: number
    transactionId: number | SQL
    userId: number | null
    action: TransactionHistoryAction
    before: Transaction | null
    /** When set, the `after` snapshot is the row as it stands under
     * `gate`, read by this statement. */
    afterStamp: Date | null
    gate: SQL
    /** The entry's own audit stamp — the write's moment. */
    now: Date
  }
): LedgerStatement {
  const after =
    args.afterStamp === null ? sql`null` : snapshotSubselect(args.gate)

  // The gate is a self-contained EXISTS over the row the write wrote.
  // The id rides as null: AUTOINCREMENT assigns it.
  return db.insert(transactionHistory).select(
    sql`select null as id, ${args.tenantId} as tenant_id, ${args.transactionId} as transaction_id, ${args.action} as action, ${snapshotOfRow(args.before)} as before, ${after} as after, ${args.userId} as created_by, ${args.now.getTime()} as created_dt where ${args.gate}`
  )
}

/** A plain, ungated history entry — for writes whose before and after are
 * both fully known in TypeScript. */
export function historyStatement(
  db: Database,
  args: {
    tenantId: number
    transactionId: number
    userId: number | null
    action: TransactionHistoryAction
    before: Transaction | null
    after: Transaction | null
  }
): LedgerStatement {
  // The snapshots are pre-built JSON text: a raw fragment stores them
  // as-is, where a plain string would be JSON-encoded a second time.
  return db.insert(transactionHistory).values({
    tenantId: args.tenantId,
    transactionId: args.transactionId,
    action: args.action,
    before:
      args.before === null ? null : sql`${snapshotOfRow(args.before)}`,
    after: args.after === null ? null : sql`${snapshotOfRow(args.after)}`,
    createdBy: args.userId,
  })
}
