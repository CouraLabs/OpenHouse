import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import type { Config } from '../config/env.js'
import { ReceiverRepository } from './receiver.repository.js'
import { ReceiverService } from './receiver.service.js'
import { receiversRoutes } from './receivers.routes.js'

export interface ReceiversDeps {
  router: App
}

export function receiversDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): ReceiversDeps {
  const receivers = new ReceiverService(new ReceiverRepository(db))
  const audit = new AuditLogService(new AuditLogRepository(db))

  return { router: receiversRoutes({ receivers, audit }).router }
}
