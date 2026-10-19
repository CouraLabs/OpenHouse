import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { relations } from './relations.js'

/**
 * The database injected with `@InjectDrizzle()`. It is declared from the
 * relations so that `db.query` is typed, and reused wherever the database is
 * injected.
 */
export type Database = NodePgDatabase<typeof relations>

/**
 * Either the injected database or a transaction it opened. Both expose the
 * same query builder, so a repository method that may run inside a
 * caller's transaction accepts either.
 */
export type DbOrTx =
  Database | Parameters<Parameters<Database['transaction']>[0]>[0]
