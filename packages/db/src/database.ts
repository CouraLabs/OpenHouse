import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { relations } from './relations.js'

/**
 * The database handle every repository takes. It is declared from the
 * relations so that `db.query` is typed, and reused wherever the database
 * is passed.
 *
 * The handle is created per request (`createDatabase(c.env.DB)`) — a D1
 * binding is not a connection pool, so creating it is cheap and there is
 * nothing to close.
 */
export type Database = DrizzleD1Database<typeof relations>

/**
 * The D1 client the handle wraps: the binding in the Worker, or a local
 * stand-in in tests. The shape is the workers `D1Database` interface,
 * declared structurally so this package needs no Workers type dependency.
 */
export interface DatabaseClient {
  prepare(query: string): {
    bind(...values: unknown[]): unknown
  }
  batch<T = unknown>(statements: unknown[]): Promise<unknown>
  exec(query: string): Promise<unknown>
}

/**
 * Builds the database over a D1 binding.
 */
export function createDatabase(client: DatabaseClient): Database {
  return drizzle(client as never, { relations })
}

/**
 * Either the database or — before the D1 move — a transaction it opened.
 * D1 has no interactive transactions, so this is only ever the database;
 * the alias stays until every caller has dropped it.
 */
export type DbOrTx = Database
