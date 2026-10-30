import { drizzle } from 'drizzle-orm/d1'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { relations } from './relations.js'

export type Database = DrizzleD1Database<typeof relations>

export interface DatabaseClient {
  prepare(query: string): {
    bind(...values: unknown[]): unknown
  }
  batch<T = unknown>(statements: unknown[]): Promise<unknown>
  exec(query: string): Promise<unknown>
}

export function createDatabase(client: DatabaseClient): Database {
  return drizzle(client as never, { relations })
}

export type DbOrTx = Database
