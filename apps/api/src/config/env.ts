import { z } from 'zod'

const flag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1')

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
  RATE_LIMIT_EMAIL?: unknown
  EMAIL?: unknown
  ASSETS: unknown

  ENVIRONMENT?: string
  KANTIM_ENABLE_EMAIL_VERIFICATION?: string
  KANTIM_ENABLE_CAPTCHA_CHECK?: string
  JWT_SECRET?: string
  JWT_ACCESS_TTL_S?: string
  JWT_REFRESH_TTL_S?: string
  JWT_REMEMBER_REFRESH_TTL_S?: string
  PUSH_VAPID_PUBLIC_KEY?: string
  PUSH_VAPID_PRIVATE_KEY?: string
  PUSH_VAPID_SUBJECT?: string
  TURNSTILE_SECRET?: string
  TURNSTILE_HOSTNAMES?: string
  TURNSTILE_SITE_KEY?: string
  EMAIL_FROM?: string
  EMAIL_FROM_NAME?: string
  APP_URL?: string
}

export interface JwtTtls {
  accessTtlS: number
  refreshTtlS: number
  rememberRefreshTtlS: number
}

export type Environment = 'development' | 'production'

export interface TurnstileConfig {
  secret: string
  hostnames: string[]
  siteKey: string
}

export interface Features {
  emailVerification: boolean
  captcha: boolean
}

export interface MailConfig {
  from: { email: string; name: string }
  appUrl: string
}

export interface PushConfig {
  publicKey: string
  privateKey: string
  subject: string
}

const DEVELOPMENT_JWT_SECRET = 'development-only-secret'

const varsSchema = z.object({
  ENVIRONMENT: z.enum(['development', 'production']).default('production'),
  KANTIM_ENABLE_EMAIL_VERIFICATION: flag.default(true),
  KANTIM_ENABLE_CAPTCHA_CHECK: flag.default(true),
  JWT_SECRET: z.string().min(1).default(DEVELOPMENT_JWT_SECRET),
  JWT_ACCESS_TTL_S: positiveInt.default(900),
  JWT_REFRESH_TTL_S: positiveInt.default(86_400),
  JWT_REMEMBER_REFRESH_TTL_S: positiveInt.default(2_592_000),
  PUSH_VAPID_PUBLIC_KEY: z.string().optional(),
  PUSH_VAPID_PRIVATE_KEY: z.string().optional(),
  PUSH_VAPID_SUBJECT: z.string().default('mailto:admin@kantim.invalid'),
  TURNSTILE_SECRET: z.string().min(1).optional(),
  TURNSTILE_HOSTNAMES: z.string().default(''),
  TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().default('no-reply@couralabs.dev'),
  EMAIL_FROM_NAME: z.string().min(1).default('Kantim'),
  APP_URL: z
    .string()
    .url()
    .default('http://localhost:5173/app')
    .transform((value) => value.replace(/\/+$/, '')),
})

export interface Config {
  environment: Environment
  features: Features
  jwtSecret: string
  ttls: JwtTtls
  push: PushConfig | undefined
  turnstile: TurnstileConfig | undefined
  mail: MailConfig
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

  const production = vars.ENVIRONMENT === 'production'
  const features: Features = {
    emailVerification: production && vars.KANTIM_ENABLE_EMAIL_VERIFICATION,
    captcha: production && vars.KANTIM_ENABLE_CAPTCHA_CHECK,
  }

  if (production && vars.JWT_SECRET === DEVELOPMENT_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production.')
  }

  const turnstileHostnames = vars.TURNSTILE_HOSTNAMES.split(',')
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname !== '')

  if (
    features.captcha &&
    (vars.TURNSTILE_SECRET === undefined ||
      vars.TURNSTILE_SITE_KEY === undefined ||
      turnstileHostnames.length === 0)
  ) {
    throw new Error(
      'KANTIM_ENABLE_CAPTCHA_CHECK needs TURNSTILE_SECRET, TURNSTILE_SITE_KEY and TURNSTILE_HOSTNAMES.'
    )
  }

  cached = {
    environment: vars.ENVIRONMENT,
    features,
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
    turnstile:
      features.captcha &&
      vars.TURNSTILE_SECRET !== undefined &&
      vars.TURNSTILE_SITE_KEY !== undefined
        ? {
            secret: vars.TURNSTILE_SECRET,
            hostnames: turnstileHostnames,
            siteKey: vars.TURNSTILE_SITE_KEY,
          }
        : undefined,
    mail: {
      from: { email: vars.EMAIL_FROM, name: vars.EMAIL_FROM_NAME },
      appUrl: vars.APP_URL,
    },
  }

  return cached
}

export function resetConfigCache(): void {
  cached = undefined
}
