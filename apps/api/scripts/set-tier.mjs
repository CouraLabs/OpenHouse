#!/usr/bin/env node
/**
 * Moves a tenant to another plan. Tiers change only here, with server
 * access — there is no billing yet and no HTTP route sets a tier.
 *
 *   npm run set-tier -- --tenant 12 --tier 1
 *   npm run set-tier -- --tenant "The Smiths" --tier 3 --remote
 *
 * Tiers: -1 Developer, 0 Free, 1 Plus, 2 Pro, 3 Max (see packages/domain
 * src/tiers.ts). The D1 database is reached through `wrangler d1 execute`
 * (`--local` unless `--remote` is passed).
 */

import { spawnSync } from 'node:child_process'

const TIER_NAMES = { '-1': 'Developer', 0: 'Free', 1: 'Plus', 2: 'Pro', 3: 'Max' }

const args = process.argv.slice(2)
const tenant = flagValue('--tenant')
const tier = flagValue('--tier')
const remote = args.includes('--remote')

if (tenant === undefined || tier === undefined || !(tier in TIER_NAMES)) {
  process.stderr.write(
    'Usage: npm run set-tier -- --tenant <id|name> --tier <-1|0|1|2|3> [--remote]\n'
  )
  process.exit(2)
}

function flagValue(flag) {
  const index = args.indexOf(flag)

  return index === -1 ? undefined : args[index + 1]
}

/** Runs `wrangler d1 execute DB --command <sql> --json` and answers the JSON. */
function d1(sql) {
  const result = spawnSync(
    'wrangler',
    ['d1', 'execute', 'DB', '--command', sql, '--json', ...(remote ? ['--remote'] : [])],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' }
  )

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.exit(1)
  }

  return JSON.parse(result.stdout.slice(result.stdout.indexOf('[')))
}

const where = /^\d+$/.test(tenant)
  ? `id = ${Number(tenant)}`
  : `name = '${tenant.replaceAll("'", "''")}'`

const found = d1(`select id, name, tier from tenants where ${where}`)[0]?.results?.[0]

if (found === undefined) {
  process.stderr.write(`No tenant matches ${tenant}.\n`)
  process.exit(1)
}

d1(`update tenants set tier = ${Number(tier)}, updated_at = ${Date.now()} where id = ${found.id}`)

process.stdout.write(
  `${found.name} (#${found.id}): ${TIER_NAMES[found.tier] ?? found.tier} -> ${TIER_NAMES[tier]}\n`
)
