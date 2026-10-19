import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { GoalsController } from './goals.controller.js'
import { GoalRepository } from './goal.repository.js'
import { GoalService } from './goal.service.js'

/**
 * The goal routes: the CRUD of the tenant's savings goals. The tenant
 * context comes from the session, never from the request; the account
 * check reaches into the accounts feature through its repository, and the
 * main currency every goal is denominated in comes from the settings
 * feature's repository.
 */
@Module({
  imports: [AccountsModule, SettingsModule],
  controllers: [GoalsController],
  providers: [GoalRepository, GoalService],
})
export class GoalsModule {}
