#!/usr/bin/env node
/**
 * Runs `drizzle-kit generate` and names the migration after its content.
 *
 * `drizzle-kit generate` names a migration `<utc timestamp>_<random words>` and
 * only lets you replace the words through its `--name` flag, so this script
 * generates the migration and then renames it to `<utc timestamp>_<hash>`,
 * where the hash is the SHA-256 of the generated SQL. Migrations are then
 * identified by what they do instead of by a random name.
 *
 * The `<utc timestamp>_` prefix has to stay. `drizzle-kit` lists the migration
 * folders and sorts them by name, and that order is the order it applies them
 * in, so a bare hash would shuffle the migrations.
 *
 * An explicit `--name` is still honoured, and every other flag is passed
 * through to `drizzle-kit generate`.
 *
 * Usage: npm run db:generate [-- <drizzle-kit generate flags>]
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, readFileSync, renameSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Characters of the digest kept as the migration name. */
const HASH_LENGTH = 12

/** The file this script reads the migrations folder and the schema from. */
const CONFIG_FILE = 'drizzle.config.ts'

const packageRoot = findPackageRoot()
const requestedArgs = process.argv.slice(2)
const wantsJson = flagValue(requestedArgs, '--output') === 'json'
const requestedName = flagValue(requestedArgs, '--name')

const envelope = runGenerate(stripFlag(requestedArgs, '--output'))

if (envelope.status === 'no_changes') {
  report(envelope)
  process.exit(0)
}

if (envelope.status !== 'ok' || typeof envelope.migration_path !== 'string') {
  report(envelope)
  process.exit(1)
}

const migrationPath = requestedName
  ? envelope.migration_path
  : renameToContentHash(envelope.migration_path)

report({
  status: 'ok',
  dialect: envelope.dialect,
  migration_path: migrationPath,
})

/** Runs `drizzle-kit generate` and returns the envelope it printed. */
function runGenerate(args) {
  const result = spawnSync(
    drizzleKitCli(),
    ['generate', '--output', 'json', ...args],
    { cwd: packageRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  )

  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  // drizzle-kit reports progress and errors on stderr.
  if (stderr !== '') {
    process.stderr.write(stderr)
  }

  if (result.status === 0) {
    return JSON.parse(stdout)
  }

  // A failed run is reported as an envelope on stdout, with an exit code that
  // matches the status: 2 when the diff needs hints, 1 for an error.
  reportFailure(stdout, stderr)
  process.exit(result.status ?? 1)
}

/**
 * Renames the folder `drizzle-kit` just wrote to `<utc timestamp>_<hash>` and
 * returns the path of the migration inside it.
 *
 * Wrangler's migrator (`wrangler d1 migrations apply`) cannot read the
 * folder-per-migration layout drizzle-kit writes: it lists flat `NNNN_*.sql`
 * files in the folder `wrangler.jsonc`'s `migrations_dir` names. The rename
 * therefore also copies the migration to `<timestamp>_<hash>.sql` beside the
 * folder — the folder stays for drizzle-kit's journal, the flat file is what
 * Wrangler applies and tracks in its own `d1_migrations` table.
 */
function renameToContentHash(generatedPath) {
  const sqlPath = resolve(packageRoot, generatedPath)
  const folder = dirname(sqlPath)
  const [timestamp] = basename(folder).split('_')

  const hash = createHash('sha256')
    .update(readFileSync(sqlPath))
    .digest('hex')
    .slice(0, HASH_LENGTH)

  const target = join(dirname(folder), `${timestamp}_${hash}`)
  if (existsSync(target)) {
    throw new Error(`${target} already exists, so ${folder} was not renamed.`)
  }

  renameSync(folder, target)
  copyFileSync(join(target, basename(sqlPath)), join(dirname(folder), `${timestamp}_${hash}.sql`))

  return relative(packageRoot, join(target, basename(sqlPath)))
}

/** Prints the result the way the caller asked to read it. */
function report(envelope) {
  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(envelope)}\n`)
    return
  }

  if (envelope.status === 'no_changes') {
    process.stdout.write('No schema changes, nothing to migrate\n')
    return
  }

  process.stdout.write(`Migration written to ${envelope.migration_path}\n`)
}

/** Prints a failed run: the envelope in JSON mode, what stderr didn't say otherwise. */
function reportFailure(stdout, stderr) {
  if (wantsJson) {
    process.stdout.write(stdout)
    return
  }

  if (stdout.trim() === '') {
    return
  }

  let envelope
  try {
    envelope = JSON.parse(stdout)
  } catch {
    process.stdout.write(stdout)
    return
  }

  const message = envelope.error?.message
  // An error message is already on stderr, but a diff waiting for hints only
  // exists in the envelope.
  if (message) {
    if (stderr === '') {
      process.stdout.write(`${message}\n`)
    }
    return
  }

  process.stdout.write(stdout)
}

/** Returns the value of a `--flag value` or `--flag=value` argument. */
function flagValue(args, flag) {
  const index = args.indexOf(flag)
  if (index !== -1) {
    return args[index + 1]
  }

  const inline = args.find((arg) => arg.startsWith(`${flag}=`))
  return inline?.slice(flag.length + 1)
}

/** Removes a `--flag value` or `--flag=value` argument from the list. */
function stripFlag(args, flag) {
  const index = args.indexOf(flag)
  const stripped =
    index === -1 ? args : [...args.slice(0, index), ...args.slice(index + 2)]
  return stripped.filter((arg) => !arg.startsWith(`${flag}=`))
}

/** Resolves `drizzle-kit`'s CLI from where this package installed it. */
function drizzleKitCli() {
  const packageDir = dirname(
    fileURLToPath(import.meta.resolve('drizzle-kit/cli'))
  )
  const manifest = JSON.parse(
    readFileSync(join(packageDir, 'package.json'), 'utf8')
  )
  const bin =
    typeof manifest.bin === 'string'
      ? manifest.bin
      : manifest.bin?.['drizzle-kit']
  const cli = bin ? resolve(packageDir, bin) : undefined

  if (!cli || !existsSync(cli)) {
    throw new Error(`Could not find drizzle-kit's CLI in ${packageDir}.`)
  }

  return cli
}

/** Walks up from this script to the package that owns `drizzle.config.ts`. */
function findPackageRoot() {
  let directory = dirname(fileURLToPath(import.meta.url))

  while (!existsSync(join(directory, CONFIG_FILE))) {
    const parent = dirname(directory)
    if (parent === directory) {
      throw new Error(`No ${CONFIG_FILE} found above ${import.meta.url}.`)
    }
    directory = parent
  }

  return directory
}
