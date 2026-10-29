import type { Database } from '@workspace/db'

import { AuditLogService } from '../audit/audit-log.service.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { InviteCodeService } from './invite-code.service.js'
import { TenantUserRepository } from './tenant-user.repository.js'
import { TenantUserService } from './tenant-user.service.js'
import { tenantsRoutes } from './tenants.routes.js'

/** The tenants feature's wiring: its routes, mounted under `/api/tenants`. */
export interface TenantsDeps {
  router: App
}

/**
 * Builds the tenants feature's services from the request's dependencies —
 * the explicit composition the DI container once did. The anonymization's
 * audit line rides the `AuditRecorder` port the audit feature implements.
 */
export function tenantsDeps(
  db: Database,
  _config: Config,
  clock: SystemClock
): TenantsDeps {
  return {
    router: tenantsRoutes({
      inviteCodes: new InviteCodeService(db, clock),
      tenantUsers: new TenantUserService(
        new TenantUserRepository(db),
        new AuditLogService(new AuditLogRepository(db)),
        clock
      ),
    }),
  }
}
