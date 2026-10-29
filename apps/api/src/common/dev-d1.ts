import { DatabaseSync } from 'node:sqlite'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A local D1 stand-in over Node's built-in SQLite (`node:sqlite`).
 *
 * Transitional: the Worker speaks to the real D1 binding, but while the
 * NestJS application still boots (through Phase 2) it needs the same client
 * surface against a local file. This implements exactly what Drizzle's
 * `drizzle-orm/d1` driver calls — `prepare().bind()`, `first/run/all/raw`,
 * `batch`, `exec` — with D1's semantics where they matter:
 *
 * - `batch` runs every statement in one transaction, atomically;
 * - foreign keys are enforced;
 * - failures carry the SQLite message text ("UNIQUE constraint failed: …"),
 *   which is what `db-errors.ts` maps to 409/400.
 *
 * Deleted with the NestJS application: workerd supplies the real thing.
 */

/** The migrations folder the flat `NNNN_*.sql` files live in. */
const MIGRATIONS_DIR = join(import.meta.dirname, '../../../../packages/db/drizzle')

interface RunResult {
  results: Record<string, unknown>[]
  meta: { changes: number; lastRowId: number; duration: number }
}

class LocalStatement {
  constructor(
    private readonly sqlite: DatabaseSync,
    private readonly sql: string,
    private readonly params: unknown[] = []
  ) {}

  /** Immutable, like D1: binding answers a new statement. */
  bind(...params: unknown[]): LocalStatement {
    return new LocalStatement(this.sqlite, this.sql, params)
  }

  async all(): Promise<RunResult> {
    return this.runSync()
  }

  async run(): Promise<RunResult> {
    return this.runSync()
  }

  async first(): Promise<Record<string, unknown> | undefined> {
    return this.runSync().results[0]
  }

  /** Rows as arrays — column order, the shape `raw()` answers. Drizzle's
   * D1 session maps positionally, so the arrays must survive duplicate
   * column names (a joined select reads `name` off three tables): the
   * statement runs with `setReturnArrays`, not the object form whose
   * duplicate keys collapse. */
  async raw(): Promise<unknown[][]> {
    const stmt = this.sqlite.prepare(this.sql)
    ;(stmt as unknown as { setReturnArrays(value: boolean): void }).setReturnArrays(true)
    return stmt.all(...(this.params as never[])) as unknown as unknown[][]
  }

  /** One row as arrays, column order. */
  async rawFirst(): Promise<unknown[] | undefined> {
    return (await this.raw())[0]
  }

  private runSync(): RunResult {
    const stmt = this.sqlite.prepare(this.sql)
    // A DML statement without RETURNING answers its affected-row count
    // (the meta the ledger guards check); everything else answers rows.
    const isDmlWithoutReturning =
      /^\s*(insert|update|delete)/i.test(this.sql) &&
      !/\breturning\b/i.test(this.sql)

    if (isDmlWithoutReturning) {
      const ran = stmt.run(...(this.params as never[])) as {
        changes: number | bigint
        lastInsertRowid: number | bigint
      }

      return {
        results: [],
        meta: {
          changes: Number(ran.changes),
          lastRowId: Number(ran.lastInsertRowid),
          duration: 0,
        },
      }
    }

    const rows = stmt.all(...(this.params as never[])) as Record<
      string,
      unknown
    >[]

    return {
      results: rows,
      meta: { changes: 0, lastRowId: 0, duration: 0 },
    }
  }
}

export interface LocalD1 {
  prepare(sql: string): LocalStatement
  batch(statements: LocalStatement[]): Promise<RunResult[]>
  exec(query: string): Promise<void>
  /** Applies the pending `NNNN_*.sql` migrations, in name order. */
  migrate(): void
  /** Closes the underlying database (application shutdown). */
  close(): void
}

export function createLocalD1(path: string): LocalD1 {
  const sqlite = new DatabaseSync(path)
  // D1 enforces foreign keys; a local file must behave the same.
  sqlite.exec('PRAGMA foreign_keys = ON')
  // One connection, one writer — the shape D1 has anyway.
  sqlite.exec('PRAGMA busy_timeout = 5000')

  return {
    prepare(sql: string) {
      return new LocalStatement(sqlite, sql)
    },

    async batch(statements: LocalStatement[]) {
      sqlite.exec('BEGIN')
      try {
        const results: RunResult[] = []
        for (const statement of statements) {
          results.push(await statement.run())
        }
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },

    async exec(query: string) {
      sqlite.exec(query)
    },

    close() {
      sqlite.close()
    },

    /** Applies the pending migration SQL files to the database, in name
     * order — the same order `wrangler d1 migrations apply` would — and
     * tracks what it applied in a `d1_migrations` table like Wrangler's. */
    migrate() {
      sqlite.exec(
        'CREATE TABLE IF NOT EXISTS d1_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)'
      )

      const files = readdirSync(MIGRATIONS_DIR)
        .filter((file) => file.endsWith('.sql'))
        .sort()

      for (const file of files) {
        const applied = sqlite
          .prepare('SELECT 1 FROM d1_migrations WHERE name = ?')
          .get(file)

        if (applied !== undefined) {
          continue
        }

        sqlite.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
        sqlite.prepare('INSERT INTO d1_migrations (name) VALUES (?)').run(file)
      }
    },
  }
}
