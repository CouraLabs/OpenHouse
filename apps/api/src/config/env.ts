import { z } from 'zod'

/**
 * The environment contract of the Worker.
 *
 * Every value the application reads arrives as a binding (`c.env`): the D1
 * database, the job queue, the rate-limit namespaces, the non-secret vars,
 * and the secrets (`JWT_SECRET`, the VAPID private key — `.dev.vars` locally,
 * `wrangler secret put` in production). This is the only file that reads it:
 * it parses the vars with zod once per isolate and caches the result, so a
 * typo or an unusable value fails the first request that needs it, naming
 * the variable — and no feature ever touches `c.env` itself.
 */

const positiveInt = z.coerce
  .number()
  .int()
  .positive()
  .transform((value) => Math.trunc(value))

/**
 * The typed bindings and vars a request sees. `DB`, `JOBS`, `RATE_LIMIT`
 * and `ASSETS` are runtime bindings typed structurally (the generated
 * `worker-configuration.d.ts` narrows them); the rest are vars and secrets.
 */
export interface Env {
  DB: unknown
  JOBS: unknown
  RATE_LIMIT: unknown
  RATE_LIMIT_CREDENTIALS: unknown
  ASSETS: unknown

  JWT_SECRET?: string
  JWT_ACCESS_TTL_S?: string
  JWT_REFRESH_TTL_S?: string
  JWT_REMEMBER_REFRESH_TTL_S?: string
  PUSH_VAPID_PUBLIC_KEY?: string
  PUSH_VAPID_PRIVATE_KEY?: string
  PUSH_VAPID_SUBJECT?: string
}

/** How long the tokens live, in seconds — the lifetimes the session sets. */
export interface JwtTtls {
  accessTtlS: number
  refreshTtlS: number
  rememberRefreshTtlS: number
}

/** The VAPID keys and contact web push signs with. */
export interface PushConfig {
  publicKey: string
  privateKey: string
  subject: string
}

/** The vars, parsed. */
const varsSchema = z.object({
  JWT_SECRET: z.string().min(1).default('development-only-secret'),
  JWT_ACCESS_TTL_S: positiveInt.default(900),
  JWT_REFRESH_TTL_S: positiveInt.default(86_400),
  JWT_REMEMBER_REFRESH_TTL_S: positiveInt.default(2_592_000),
  PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  PUSH_VAPID_SUBJECT: z.string().default('mailto:admin@openhouse.invalid'),
})

/** The parse result, cached per isolate. */
export interface Config {
  jwtSecret: string
  ttls: JwtTtls
  /** Web push configuration, or nothing when the VAPID pair is absent —
   * push is then disabled, and everything else runs as usual. */
  push: PushConfig | undefined
}

let cached: Config | undefined

/**
 * Parses `c.env`'s vars once per isolate. A half-set VAPID pair is a boot
 * error; a missing secret falls back to the development default (the tokens
 * it signs are only honored by the same deployment).
 */
export function config(env: Env): Config {
  if (cached !== undefined) {
    return cached
  }

  const vars = varsSchema.parse(env)

  const hasPublic = vars.PUSH_VAPID_PUBLIC_KEY !== undefined
  const hasPrivate = vars.PUSH_VAPID_PRIVATE_KEY !== undefined

  if (hasPublic !== hasPrivate) {
    throw new Error(
      'PUSH_VAPID_PUBLIC_KEY and PUSH_VAPID_PRIVATE_KEY must be set together, or both left out to disable web push.'
    )
  }

  cached = {
    jwtSecret: vars.JWT_SECRET,
    ttls: {
      accessTtlS: vars.JWT_ACCESS_TTL_S,
      refreshTtlS: vars.JWT_REFRESH_TTL_S,
      rememberRefreshTtlS: vars.JWT_REMEMBER_REFRESH_TTL_S,
    },
    push:
      vars.PUSH_VAPID_PUBLIC_KEY !== undefined &&
      vars.PUSH_VAPID_PRIVATE_KEY !== undefined
        ? {
            publicKey: vars.PUSH_VAPID_PUBLIC_KEY,
            privateKey: vars.PUSH_VAPID_PRIVATE_KEY,
            subject: vars.PUSH_VAPID_SUBJECT,
          }
        : undefined,
  }

  return cached
}

/** Clears the per-isolate cache — a test isolate re-parses. */
export function resetConfigCache(): void {
  cached = undefined
}
