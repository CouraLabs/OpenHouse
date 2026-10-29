import type { Database } from '@workspace/db'

import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { DataExportRepository } from './data-export.repository.js'
import { DataExportService } from './data-export.service.js'
import { dataExportsRoutes } from './data-exports.routes.js'

/** The full-export feature's wiring: its one route — the owner's export
 * download. */
export interface DataExportsDeps {
  /** Mounted at `/data-exports`. */
  router: App
}

/**
 * Builds the data export feature's services from the request's
 * dependencies — the explicit composition the DI module once did. The
 * services are cheap objects, rebuilt per request from the same handles.
 */
export function dataExportsDeps(
  db: Database,
  /** Unused today — kept in the signature every deps builder shares, so a
   * rule that needs a secret or a ttl plugs in without a rewrite. */
  _config: Config,
  clock: SystemClock
): DataExportsDeps {
  const { router } = dataExportsRoutes({
    exports: new DataExportService(
      new DataExportRepository(db),
      new AuditLogService(new AuditLogRepository(db)),
      clock
    ),
  })

  return { router }
}
