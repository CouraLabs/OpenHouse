import { z } from 'zod'

const positiveInt = z.coerce
  .number()
  .int()
  .positive()
  .transform((value) => Math.trunc(value))

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

export interface JwtTtls {
  accessTtlS: number
  refreshTtlS: number
  rememberRefreshTtlS: number
}

export interface PushConfig {
  publicKey: string
  privateKey: string
  subject: string
}

const varsSchema = z.object({
  JWT_SECRET: z.string().min(1).default('development-only-secret'),
  JWT_ACCESS_TTL_S: positiveInt.default(900),
  JWT_REFRESH_TTL_S: positiveInt.default(86_400),
  JWT_REMEMBER_REFRESH_TTL_S: positiveInt.default(2_592_000),
  PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  PUSH_VAPID_SUBJECT: z.string().default('mailto:admin@openhouse.invalid'),
})

export interface Config {
  jwtSecret: string
  ttls: JwtTtls
  push: PushConfig | undefined
}

let cached: Config | undefined

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

export function resetConfigCache(): void {
  cached = undefined
}
