import { Module } from '@nestjs/common'

import { CategoriesModule } from '../categories/categories.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { TransactionsModule } from '../transactions/transactions.module.js'
import { LimitsController } from './limits.controller.js'
import { LimitRepository } from './limit.repository.js'
import { LimitService } from './limit.service.js'

/**
 * The limit routes: the CRUD of the tenant's spending limits. The tenant
 * context comes from the session, never from the request; the category
 * check reaches into the categories feature through its repository, and
 * the usage view totals its spending through the transactions feature's
 * repository over periods on the tenant's own calendar (its time zone from
 * the settings feature's repository) — the one sanctioned crossing between features.
 */
@Module({
  imports: [CategoriesModule, SettingsModule, TransactionsModule],
  controllers: [LimitsController],
  providers: [LimitRepository, LimitService],
})
export class LimitsModule {}
