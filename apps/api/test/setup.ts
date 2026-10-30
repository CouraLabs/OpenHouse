import { applyD1Migrations } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

import type { D1Migration } from '@cloudflare/vitest-plugin'

/**
 * Runs in the Workers runtime before every test file: applies the schema
 * migrations to the test's D1 database, so every spec sees the baseline.
 * The migration SQL files are read at build time (vite's `?raw` imports)
 * and applied in name order — the order `wrangler d1 migrations apply`
 * would use.
 */
const files = import.meta.glob('../../../packages/db/drizzle/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const migrations: D1Migration[] = Object.entries(files)
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(([path, sql]) => ({
    name: path.split('/').at(-1) ?? path,
    queries: sql
      .split('--> statement-breakpoint')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0),
  }))

await applyD1Migrations(env.DB, migrations)

/**
 * Turnstile's siteverify, answered in-process: a token `pass:<action>` is a
 * solved check minted for that action on localhost; anything else failed.
 * Every other request goes out untouched.
 */
const realFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input)

  if (url !== 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
    return realFetch(input, init)
  }

  const token =
    new URLSearchParams(String(init?.body ?? '')).get('response') ?? ''
  const [verdict, action] = token.split(':')

  return Response.json(
    verdict === 'pass'
      ? { success: true, action, hostname: 'localhost' }
      : { success: false, 'error-codes': ['invalid-input-response'] }
  )
}
