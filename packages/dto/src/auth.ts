import { z } from "zod"
import {
  CAPTCHA_FAILED,
  CAPTCHA_REQUIRED,
  EMAIL_UNVERIFIED,
  resetCodeKinds,
  type AccountSecurity,
  type AuthConfig,
  type CaptchaError,
  type EmailUnverifiedError,
  type IssuedResetCode,
  type RecoveryCodes,
  type ResetCodeKind,
  type SignUpAccepted,
  type SignUpResponse,
} from "@workspace/domain"
import { currencySchema } from "./currencies.js"
import { timeZoneSchema } from "./settings.js"

export {
  CAPTCHA_FAILED,
  CAPTCHA_REQUIRED,
  EMAIL_UNVERIFIED,
  resetCodeKinds,
  type AccountSecurity,
  type AuthConfig,
  type CaptchaError,
  type EmailUnverifiedError,
  type IssuedResetCode,
  type RecoveryCodes,
  type ResetCodeKind,
  type SignUpAccepted,
  type SignUpResponse,
}

const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")

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
    message: "Send exactly one of tenantName or tenantCode.",
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
    message: "The new password must differ from the current one.",
    path: ["newPassword"],
  })

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1).max(128),
})

export const resendVerificationSchema = z.object({
  email,
  turnstileToken: turnstileTokenSchema.optional(),
})

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
