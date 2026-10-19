import { z } from 'zod'
import { currencySchema } from './currencies.js'
import { timeZoneSchema } from './settings.js'

/**
 * The bodies the auth routes accept and the web forms validate against. One
 * schema per side would drift; these are the single source both the API's
 * `ZodValidationPipe` and the web's `zodResolver` run.
 */

/** The password rule every sign-up and sign-in body shares. */
const password = z.string().min(8).max(72)

/**
 * The email rule every sign-up and sign-in body shares. An email is one user
 * across every tenant, so it is normalized — trimmed and lowercased — before
 * it is checked: `Ana@Example.com ` signs in as `ana@example.com`.
 */
const email = z.string().trim().toLowerCase().email().max(320)

/**
 * The exclusivity rule a body must satisfy: exactly one of a new tenant name
 * or an invite code. Exported so consumers that hold both fields as plain
 * strings — the web form, whose fields are never `undefined` — apply the
 * same rule without reaching into schema internals.
 */
export function hasExactlyOneTenantField(body: {
  tenantName?: string
  tenantCode?: string
}): boolean {
  return (body.tenantName === undefined) !== (body.tenantCode === undefined)
}

export const signUpSchema = z
  .object({
    /** The tenant to create. When a code is sent instead, it must be empty. */
    tenantName: z.string().min(1).max(120).optional(),
    /** The invite code of the tenant to join. When a tenant name is sent, it must be empty. */
    tenantCode: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(120),
    email,
    password,
    /** The browser's time zone, which a new tenant's settings start on.
     * Ignored when joining with a code. */
    timezone: timeZoneSchema.optional(),
    /** The main currency of a new tenant, defaulted from the browser locale.
     * Ignored when joining with a code. */
    currency: currencySchema.optional(),
  })
  .refine(hasExactlyOneTenantField, {
    message: 'Send exactly one of tenantName or tenantCode.',
  })

export const signInSchema = z.object({
  email,
  password,
  /** Extends the refresh cookie to the remembered lifetime when true. */
  rememberMe: z.boolean().optional().default(false),
})

/**
 * The body changing the signed-in user's password. The current password is
 * only compared, never re-validated against the rule — the new one follows
 * it, and must differ from the current one.
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: password,
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    message: 'The new password must differ from the current one.',
    path: ['newPassword'],
  })

export type SignUpBody = z.infer<typeof signUpSchema>
export type SignInBody = z.infer<typeof signInSchema>
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>
