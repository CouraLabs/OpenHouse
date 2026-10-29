import type { Tenant, User, UserRole } from '@workspace/db'

/**
 * The tenant-scoped identity a request acts as, which the auth middleware
 * attaches after it resolves the session. Every route reads its context
 * from here (`c.var.session`) and nowhere else — a client has no say in
 * which tenant it acts on.
 */
export interface Session {
  user: Omit<User, 'password' | 'refreshTokenHash'>
  tenant: Tenant
  role: UserRole
}
