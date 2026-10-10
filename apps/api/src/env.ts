/**
 * The environment contract of the API.
 *
 * Every variable the application reads is declared here, together with the
 * values it accepts, so a typo or an unusable value stops the boot with a
 * message naming the variable instead of surfacing as a broken request much
 * later. `validateEnv` is handed to `ConfigModule`; the `get*` helpers are the
 * parsing that the bootstrap and the module factories share, so nothing else
 * reads `process.env` on its own.
 *
 * The helpers read `process.env` rather than injecting `ConfigService`: they
 * are also used by `main.ts`, which runs before the container exists, and
 * `validateEnv` normalizes every value they read back into `process.env`.
 */

/** Environments the API runs in. Anything else is a typo in a deployment. */
const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const

type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number]

/**
 * Prefixes this application owns. A variable under one of them that is not
 * declared in `VARIABLES` is rejected, so `THROTTLE_LIMITS=5` fails at boot
 * instead of being ignored. Variables a host injects (`PATH`, `HOSTNAME`, …)
 * do not use these prefixes and pass through untouched.
 */
const RESERVED_PREFIXES = ['APP_', 'CORS_', 'DB_', 'THROTTLE_']

/** What a declared variable accepts. */
type VariableSpec =
  /** Read as it is. `NODE_ENV` is one of these: `readNodeEnvironment` checks it. */
  | { kind: 'text' }
  /** Origins a browser may call the API from, comma-separated. */
  | { kind: 'originList'; requiredInProduction: boolean }
  | { kind: 'positiveInteger' }

/**
 * Every variable the API reads. A declared variable that is unset falls back
 * to the default its consumer passes to `getPositiveInt`, which is also the
 * value in `.env.example`.
 */
const VARIABLES: Record<string, VariableSpec> = {
  NODE_ENV: { kind: 'text' },
  PORT: { kind: 'positiveInteger' },
  CORS_ORIGINS: { kind: 'originList', requiredInProduction: true },
  THROTTLE_TTL_MS: { kind: 'positiveInteger' },
  THROTTLE_LIMIT: { kind: 'positiveInteger' },
  DB_POOL_MAX: { kind: 'positiveInteger' },
  DB_CONNECTION_TIMEOUT_MS: { kind: 'positiveInteger' },
  DB_IDLE_TIMEOUT_MS: { kind: 'positiveInteger' },
  // Read by `@workspace/db`, not by this application directly. It is declared
  // so that the API knows the variable the database module needs.
  DATABASE_URL: { kind: 'text' },
}

/**
 * Checks the environment and returns it, adding the `NODE_ENV` the application
 * is actually running in so that no consumer repeats that fallback.
 *
 * `ConfigModule` calls this while the application is being created, so a
 * rejected value aborts the boot.
 */
export function validateEnv(
  config: Record<string, unknown>
): Record<string, unknown> {
  rejectUndeclaredReservedNames(config)

  const nodeEnv = readNodeEnvironment(config.NODE_ENV)
  for (const [name, spec] of Object.entries(VARIABLES)) {
    assertUsable(name, spec, text(config[name]), nodeEnv)
  }

  return { ...config, NODE_ENV: nodeEnv }
}

/** Returns `true` when the application runs as a deployed one. */
export function isProduction(): boolean {
  return readNodeEnvironment(process.env.NODE_ENV) === 'production'
}

/**
 * Returns the origins `CORS_ORIGINS` lists, or `undefined` when it is unset.
 * A deployment must list at least one, which `validateEnv` enforces.
 */
export function getCorsOrigins(): string[] | undefined {
  const value = text(process.env.CORS_ORIGINS)
  return value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '')
}

/** Returns the number a variable holds, or `undefined` when it holds none. */
export function getInt(name: string): number | undefined {
  const value = text(process.env[name])
  if (value === undefined || !isPositiveInteger(value)) {
    return undefined
  }

  return Number.parseInt(value, 10)
}

/**
 * Returns the number a variable holds, falling back to `fallback` when it is
 * unset. A value that is not a positive integer also falls back: `validateEnv`
 * has already rejected it by the time a consumer reads it.
 */
export function getPositiveInt(name: string, fallback: number): number {
  return getInt(name) ?? fallback
}

/** Returns a value as a string, treating an empty one as unset. */
function text(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  const raw = String(value).trim()
  return raw === '' ? undefined : raw
}

/** Returns the environment the application runs in, defaulting to development. */
function readNodeEnvironment(value: unknown): NodeEnvironment {
  const nodeEnv = text(value) ?? 'development'
  if (!NODE_ENVIRONMENTS.includes(nodeEnv as NodeEnvironment)) {
    throw new Error(
      `NODE_ENV must be one of ${NODE_ENVIRONMENTS.join(', ')}, got "${nodeEnv}".`
    )
  }

  return nodeEnv as NodeEnvironment
}

/** Rejects variables under this application's prefixes that it does not read. */
function rejectUndeclaredReservedNames(config: Record<string, unknown>): void {
  const undeclared = Object.keys(config).filter(
    (name) =>
      !(name in VARIABLES) &&
      RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix))
  )

  if (undeclared.length > 0) {
    throw new Error(
      `${undeclared.join(', ')} is not read by this application. Declared variables: ${Object.keys(VARIABLES).join(', ')}.`
    )
  }
}

/** Rejects a value a declared variable cannot hold. */
function assertUsable(
  name: string,
  spec: VariableSpec,
  value: string | undefined,
  nodeEnv: NodeEnvironment
): void {
  if (
    spec.kind === 'positiveInteger' &&
    value !== undefined &&
    !isPositiveInteger(value)
  ) {
    throw new Error(`${name} must be a positive integer, got "${value}".`)
  }

  if (
    spec.kind === 'originList' &&
    spec.requiredInProduction &&
    value === undefined &&
    nodeEnv === 'production'
  ) {
    throw new Error(
      `${name} must list at least one origin when NODE_ENV is production.`
    )
  }
}

/** Returns whether a value is entirely a positive integer. */
function isPositiveInteger(value: string): boolean {
  return /^\d+$/.test(value) && Number.parseInt(value, 10) > 0
}
