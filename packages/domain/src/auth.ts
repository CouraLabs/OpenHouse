import type { SessionResponse } from "./session.js"

export const EMAIL_UNVERIFIED = "email_unverified"

export const CAPTCHA_REQUIRED = "captcha_required"

export const CAPTCHA_FAILED = "captcha_failed"

export interface CaptchaError {
  message: string
  error: "Forbidden"
  statusCode: 403
  code: typeof CAPTCHA_REQUIRED | typeof CAPTCHA_FAILED
}

export interface AuthConfig {
  captcha: { siteKey: string } | null
  emailVerification: boolean
}

export interface SignUpAccepted {
  status: "verificationRequired"
  verificationRequired: true
  email: string
}

export type SignUpResponse =
  | (SessionResponse & { status: "accepted" })
  | SignUpAccepted

export interface EmailUnverifiedError {
  message: string
  error: "Forbidden"
  statusCode: 403
  code: typeof EMAIL_UNVERIFIED
}

export const resetCodeKinds = ["owner_issued", "recovery", "server"] as const

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
