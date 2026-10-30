import type { Tenant, User, UserRole } from '@workspace/db'

export interface Session {
  user: Omit<
    User,
    | 'password'
    | 'refreshTokenHash'
    | 'emailVerifiedAt'
    | 'emailVerificationHash'
    | 'emailVerificationExpiresAt'
    | 'emailVerificationSentAt'
    | 'emailVerificationWindowAt'
    | 'emailVerificationSends'
  >
  tenant: Tenant
  role: UserRole
}
