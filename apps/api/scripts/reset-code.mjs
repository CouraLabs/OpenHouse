#!/usr/bin/env node
/**
 * The last-resort password recovery of a self-hosted deployment: prints a
 * one-time reset code for the user an email names, valid for 30 minutes.
 * It runs with server access only — no HTTP route issues these codes — and
 * the issued code is recorded, so the user is told at their next sign-in.
 *
 *   npm run reset-code -- --email owner@example.com
 *   npm run reset-code -- --email owner@example.com --remote
 *
 * The D1 database is reached through `wrangler d1 execute` (`--local`, the
 * development database, unless `--remote` is passed, which needs the
 * Cloudflare API token the deployment already trusts). Only the SHA-256 of
 * the code is stored; the plaintext is printed once, here.
 */

import { spawnSync } from 'node:child_process'

// The pure reset-code logic, imported straight from the feature (it only
// uses WebCrypto and runs on Node as-is under type stripping).
const { generateResetCode, hashResetCode } = await import(
  '../src/auth/reset-code.ts'
)

/** How long the code works: 30 minutes. */
const SHORT_LIVED_MS = 30 * 60 * 1000

const email = emailArgument(process.argv.slice(2))
const remote = process.argv.includes('--remote')

if (email === undefined) {
  process.stderr.write('Usage: npm run reset-code -- --email owner@example.com [--remote]\n')
  process.exit(2)
}

/** Runs `wrangler d1 execute DB --command <sql> --json` and answers the JSON. */
function d1(sql) {
  const args = [
    'd1', 'execute', 'DB',
    '--command', sql,
    '--json',
    ...(remote ? ['--remote'] : []),
  ]
  const result = spawnSync('wrangler', args, {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    process.exit(1)
  }

  // wrangler prints the JSON envelope on stdout (progress on stderr).
  const start = result.stdout.indexOf('[')
  return JSON.parse(result.stdout.slice(start))
}

/** Finds the user an email names — emails are unique, lowercase-trimmed. */
const normalized = email.trim().toLowerCase()
const found = d1(
  `select id, email from users where lower(email) = '${normalized.replaceAll("'", "''")}' and is_active = 1`
)
const user = found[0]?.results?.[0]

if (user === undefined) {
  process.stderr.write(`No active user has the email ${email}.\n`)
  process.exit(1)
}

/** A fresh code, `XXXXX-XXXXX`, hashed the way the API stores and checks it. */
const code = generateResetCode()
const codeHash = await hashResetCode(code)
const expiresAt = new Date(Date.now() + SHORT_LIVED_MS)

// The user's open server codes expire now; the new one is recorded — the
// row is the audit entry, and the user is told about it at their next
// sign-in.
d1(
  `update password_reset_codes set expires_at = ${Date.now()} where user_id = ${user.id} and kind = 'server' and used_at is null`
)
d1(
  `insert into password_reset_codes (user_id, code_hash, kind, expires_at, created_at) values (${user.id}, '${codeHash}', 'server', ${expiresAt.getTime()}, ${Date.now()})`
)

process.stdout.write(
  [
    `Reset code for ${user.email}: ${code}`,
    `It works once, until ${expiresAt.toISOString()} (30 minutes).`,
    'Open /reset-password in the web app and enter it with a new password.',
    '',
  ].join('\n')
)

/** The value of `--email <value>` or `--email=<value>`. */
function emailArgument(args) {
  const index = args.indexOf('--email')
  const value =
    index === -1
      ? args.find((arg) => arg.startsWith('--email='))?.slice('--email='.length)
      : args[index + 1]

  return value === undefined || value.trim() === '' ? undefined : value.trim()
}
