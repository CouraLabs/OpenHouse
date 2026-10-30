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

export interface CategoriesDeps {
  router: App
}

export function categoriesDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): CategoriesDeps {
  const categories = new CategoryService(
    new CategoryRepository(db),
    new HouseholdRepository(db)
  )
  const audit = new AuditLogService(new AuditLogRepository(db))

  return { router: categoriesRoutes({ categories, audit }).router }
}
