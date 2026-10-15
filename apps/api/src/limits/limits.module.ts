import { Module } from '@nestjs/common'

import { CategoriesModule } from '../categories/categories.module.js'
import { LimitsController } from './limits.controller.js'
import { LimitRepository } from './limit.repository.js'
import { LimitService } from './limit.service.js'

/**
 * The limit routes: the CRUD of the tenant's spending limits. The tenant
 * context comes from the session, never from the request; the category
 * check reaches into the categories feature through its repository.
 */
@Module({
  imports: [CategoriesModule],
  controllers: [LimitsController],
  providers: [LimitRepository, LimitService],
})
export class LimitsModule {}
