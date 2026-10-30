import type { Database } from '@workspace/db'

import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { DataExportRepository } from './data-export.repository.js'
import { DataExportService } from './data-export.service.js'
import { dataExportsRoutes } from './data-exports.routes.js'

export interface DataExportsDeps {
  router: App
}

export function dataExportsDeps(
  db: Database,
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
