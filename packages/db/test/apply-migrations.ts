import { applyD1Migrations } from 'cloudflare:test'
import type { D1Migration } from '@cloudflare/vitest-plugin'

const files = import.meta.glob('../drizzle/*.sql', {
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

export async function applyDatabaseMigrations(d1: D1Database): Promise<void> {
  await applyD1Migrations(d1, migrations)
}
