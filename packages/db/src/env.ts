import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import type { PoolConfig } from 'pg'

/**
 * This package's `.env` file, which holds `DATABASE_URL`. It is resolved from
 * this file rather than from the process working directory, so the Nest
 * application, Drizzle Kit and any script read the same file no matter where
 * they are started from.
 */
export const envFile = fileURLToPath(new URL('../.env', import.meta.url))

let envLoaded = false

/**
 * Loads `DATABASE_URL` from this package's `.env` file into `process.env`.
 * Variables already set in the environment take precedence, so a deployed
 * environment needs no file at all.
 */
export function loadEnv(): void {
  if (envLoaded) {
    return
  }
  envLoaded = true
  loadDotenv({ path: envFile, quiet: true })
}

/**
 * Returns the PostgreSQL connection string, loading the `.env` file first and
 * failing fast when neither the file nor the environment defines it.
 */
export function getDatabaseUrl(): string {
  loadEnv()

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      `DATABASE_URL is not set. Add it to ${envFile} or to the environment.`
    )
  }

  return url
}

/**
 * Returns the connection pool options for PostgreSQL, loading the `.env` file
 * first.
 *
 * The pool is tuned through the environment because the right size depends on
 * the deployment. `DB_POOL_MAX` (default 10) caps the connections one process
 * opens; `DB_CONNECTION_TIMEOUT_MS` (default 5000) is how long a query waits
 * for a connection before failing, so an unreachable host reports an error
 * instead of hanging; `DB_IDLE_TIMEOUT_MS` (default 30000) is how long an idle
 * connection is kept before it is closed.
 *
 * This package is used by Drizzle Kit and by scripts as well as by the API, so
 * it reads the environment itself instead of receiving it from a caller.
 */
export function getPoolConfig(): PoolConfig {
  loadEnv()

  return {
    connectionString: getDatabaseUrl(),
    max: positiveInt('DB_POOL_MAX', 10),
    connectionTimeoutMillis: positiveInt('DB_CONNECTION_TIMEOUT_MS', 5000),
    idleTimeoutMillis: positiveInt('DB_IDLE_TIMEOUT_MS', 30_000),
  }
}

/**
 * Returns the positive integer a variable holds, or `fallback` when it holds
 * none. A value that is not a positive integer also falls back: the API
 * rejects those at boot, and a script has nowhere to report them to.
 */
function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (raw === undefined || !/^\d+$/.test(raw)) {
    return fallback
  }

  const value = Number.parseInt(raw, 10)
  return value > 0 ? value : fallback
}
