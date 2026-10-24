import { Global, Module } from '@nestjs/common'

import { AuditRecorder } from '../common/audit/audit-recorder.js'
import { AuditLogRepository } from './audit-log.repository.js'
import { AuditLogService } from './audit-log.service.js'

/**
 * The audit log. Global because recording a sensitive action is
 * infrastructure every feature may need: callers inject the abstract
 * `AuditRecorder` and never see this feature.
 */
@Global()
@Module({
  providers: [
    AuditLogRepository,
    { provide: AuditRecorder, useClass: AuditLogService },
  ],
  exports: [AuditRecorder],
})
export class AuditModule {}
