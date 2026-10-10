import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { relations } from './relations.js'

/**
 * The database injected with `@InjectDrizzle()`. It is declared from the
 * relations so that `db.query` is typed, and reused wherever the database is
 * injected.
 */
export type Database = NodePgDatabase<typeof relations>
