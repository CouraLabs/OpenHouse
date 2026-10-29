import type { Database } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { goalRoutes } from './goal.routes.js'
import { GoalRepository } from './goal.repository.js'
import { GoalService } from './goal.service.js'
import { GoalProgressSource } from './goal-progress.source.js'

/** The goals feature's wiring: its routes, mounted under `/api/goals`, and
 * the `GoalSource` port the upcoming list reads progress through. */
export interface GoalDeps {
  router: App
  /** The `GoalSource` port: every ACTIVE goal with its account's balance. */
  progressSource: GoalProgressSource
}

/**
 * Builds the goals feature's services from the request's dependencies —
 * the explicit composition the DI container once did. The export's audit
 * lines ride the `AuditRecorder` port the audit feature implements.
 */
export function goalDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): GoalDeps {
  const settings = new SettingsRepository(db)
  const goals = new GoalService(
    new GoalRepository(db),
    new AccountRepository(db),
    settings
  )

  return {
    router: goalRoutes({
      goals,
      audit: new AuditLogService(new AuditLogRepository(db)),
    }),
    progressSource: new GoalProgressSource(new GoalRepository(db), settings),
  }
}
