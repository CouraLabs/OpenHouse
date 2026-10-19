import { Module } from '@nestjs/common'
import { DatabaseModule } from '@workspace/db'

import { ClockModule } from '../common/clock/clock.module.js'
import { PasswordResetRepository } from './password-reset.repository.js'
import { PasswordResetService } from './password-reset.service.js'
import { ResetAttemptLimiter } from './reset-attempt-limiter.js'

/**
 * What the server's `reset-code` command needs and nothing more: the
 * database, the clock, and the password reset service. No HTTP server, no
 * scheduler, no tokens — the command only issues a code.
 */
@Module({
  imports: [DatabaseModule, ClockModule],
  providers: [
    PasswordResetRepository,
    PasswordResetService,
    ResetAttemptLimiter,
  ],
})
export class ResetCodeCliModule {}
