import { Module } from '@nestjs/common'

import { HouseholdModule } from '../household/household.module.js'
import { CategoriesController } from './categories.controller.js'
import { CategoryRepository } from './category.repository.js'
import { CategoryService } from './category.service.js'

/**
 * The category routes: the CRUD of the first tenant entity. The tenant
 * context comes from the session, never from the request.
 */
@Module({
  imports: [HouseholdModule],
  controllers: [CategoriesController],
  providers: [CategoryRepository, CategoryService],
  exports: [CategoryRepository],
})
export class CategoriesModule {}
