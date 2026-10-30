import type { Tenant, User, UserRole } from '@workspace/db'

export interface Session {
  user: Omit<User, 'password' | 'refreshTokenHash'>
  tenant: Tenant
  role: UserRole
}
