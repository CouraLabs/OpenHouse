import { z } from 'zod'
import { currencySchema } from './currencies.js'
import type { SessionResponse } from './session.js'
import { timeZoneSchema } from './settings.js'

const password = z.string().min(8).max(72)

const email = z.string().trim().toLowerCase().email().max(320)

export const turnstileTokenSchema = z.string().min(1).max(2048)

export function hasExactlyOneTenantField(body: {
  tenantName?: string
  tenantCode?: string
}): boolean {
  return (body.tenantName === undefined) !== (body.tenantCode === undefined)
}

export const signUpSchema = z
  .object({
    tenantName: z.string().min(1).max(120).optional(),
    tenantCode: z.string().min(1).max(120).optional(),
    name: z.string().min(1).max(120),
    email,
    password,
    timezone: timeZoneSchema.optional(),
    currency: currencySchema.optional(),
    turnstileToken: turnstileTokenSchema.optional(),
  })
  .refine(hasExactlyOneTenantField, {
    message: 'Send exactly one of tenantName or tenantCode.',
  })

export const signInSchema = z.object({
  email,
  password,
  rememberMe: z.boolean().optional().default(false),
  turnstileToken: turnstileTokenSchema.optional(),
})

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: password,
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    message: 'The new password must differ from the current one.',
    path: ['newPassword'],
  })

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1).max(128),
})

export const resendVerificationSchema = z.object({
  email,
  turnstileToken: turnstileTokenSchema.optional(),
})

export const EMAIL_UNVERIFIED = 'email_unverified'

export const CAPTCHA_REQUIRED = 'captcha_required'

export const CAPTCHA_FAILED = 'captcha_failed'

export interface CaptchaError {
  message: string
  error: 'Forbidden'
  statusCode: 403
  code: typeof CAPTCHA_REQUIRED | typeof CAPTCHA_FAILED
}

export interface AuthConfig {
  captcha: { siteKey: string } | null
  emailVerification: boolean
}

export type SignUpResponse = SessionResponse | SignUpAccepted

export function isSignUpAccepted(
  response: SignUpResponse
): response is SignUpAccepted {
  return 'verificationRequired' in response
}

export interface SignUpAccepted {
  verificationRequired: true
  email: string
}

export interface EmailUnverifiedError {
  message: string
  error: 'Forbidden'
  statusCode: 403
  code: typeof EMAIL_UNVERIFIED
}

export type SignUpBody = z.infer<typeof signUpSchema>
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>
export type SignInBody = z.infer<typeof signInSchema>
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>

export const resetCodeSchema = z.string().trim().min(1).max(32)

export const resetPasswordSchema = z.object({
  code: resetCodeSchema,
  newPassword: password,
})

export const issueResetCodeSchema = z.object({
  userId: z.number().int().positive(),
})

export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>
export type IssueResetCodeBody = z.infer<typeof issueResetCodeSchema>

export const resetCodeKinds = ['owner_issued', 'recovery', 'server'] as const

export type ResetCodeKind = (typeof resetCodeKinds)[number]

export interface IssuedResetCode {
  code: string
  expiresAt: string
}

export interface RecoveryCodes {
  codes: string[]
}

export interface AccountSecurity {
  recoveryCodes: {
    remaining: number
    generatedAt: string | null
  }
  serverResetNotices: string[]
}
