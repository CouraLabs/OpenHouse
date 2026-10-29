import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import { AuditLogService } from '../audit/audit-log.service.js'
import { AuditLogRepository } from '../audit/audit-log.repository.js'
import { HouseholdRepository } from '../household/household.repository.js'
import type { Config } from '../config/env.js'
import { CategoryRepository } from './category.repository.js'
import { CategoryService } from './category.service.js'
import { categoriesRoutes } from './categories.routes.js'

/** The categories feature's wiring: its router. */
export interface CategoriesDeps {
  router: App
}

/**
 * Builds the categories feature's services from the request's dependencies
 * — the explicit composition the DI container once did. The services are
 * cheap objects, rebuilt per request from the same handles.
 */
export function categoriesDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): CategoriesDeps {
  const categories = new CategoryService(
    new CategoryRepository(db),
    // The household repository is the implementation of the port the
    // category service validates a default split through.
    new HouseholdRepository(db)
  )
  const audit = new AuditLogService(new AuditLogRepository(db))

  return { router: categoriesRoutes({ categories, audit }).router }
}
