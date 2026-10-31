import { and, eq, getTableColumns, sql, type SQL } from 'drizzle-orm'
import type { Database } from '../database.js'
import { centsToDecimalSql } from '../money-sql.js'
import {
  transactionHistory,
  transactions,
  type Transaction,
  type TransactionHistoryAction,
} from '../schema.js'
import type { LedgerStatement } from './ledger-batch.js'

function snapshotOfRow(row: Transaction | null): string | null {
  return row === null ? null : JSON.stringify(row)
}

const SNAPSHOT_PAIRS: SQL[] = Object.entries(
  getTableColumns(transactions)
).flatMap(([key, column]): SQL[] => {
  const ref = sql`${sql.identifier(column.name)}`

  switch (column.columnType) {
    case 'SQLiteCustomColumn':
      return [sql`${key}`, centsToDecimalSql(ref)]
    case 'SQLiteTimestamp':
      return [
        sql`${key}`,
        sql`strftime('%Y-%m-%dT%H:%M:%S', ${ref} / 1000, 'unixepoch') || printf('.%03dZ', ${ref} % 1000)`,
      ]
    case 'SQLiteBoolean':
      return [
        sql`${key}`,
        sql`case when ${ref} = 1 then json('true') else json('false') end`,
      ]
    case 'SQLiteTextJson':
      return [sql`${key}`, sql`json(${ref})`]
    default:
      return [sql`${key}`, ref]
  }
})

function snapshotSubselect(predicate: SQL): SQL {
  return sql`(select json_object(${sql.join(SNAPSHOT_PAIRS, sql`, `)}) from ${transactions} where ${predicate})`
}

export function auditedUpdateStatements(
  db: Database,
  args: {
    tenantId: number
    id: number
    userId: number | null
    before: Transaction
    set: Record<string, unknown>
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

function gatedHistory(
  db: Database,
  args: {
    tenantId: number
    transactionId: number | SQL
    userId: number | null
    action: TransactionHistoryAction
    before: Transaction | null
    afterStamp: Date | null
    gate: SQL
    now: Date
  }
): LedgerStatement {
  const after =
    args.afterStamp === null ? sql`null` : snapshotSubselect(args.gate)

  return db.insert(transactionHistory).select(
    sql`select null as id, ${args.tenantId} as tenant_id, ${args.transactionId} as transaction_id, ${args.action} as action, ${snapshotOfRow(args.before)} as before, ${after} as after, ${args.userId} as created_by, ${args.now.getTime()} as created_dt where ${args.gate}`
  )
}

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
