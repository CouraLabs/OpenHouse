import { Module } from '@nestjs/common'

import { HouseholdMembers } from '../common/household/household-members.js'
import { SettingsModule } from '../settings/settings.module.js'
import { HouseholdController } from './household.controller.js'
import { HouseholdRepository } from './household.repository.js'
import { HouseholdService } from './household.service.js'

/**
 * The household: members, balances, and the reports built on them. It reads
 * the transactions and splits through the shared schema and imports no
 * feature but settings, so the features that validate a payer or a split
 * can depend on its `HouseholdMembers` port without a cycle.
 */
@Module({
  imports: [SettingsModule],
  controllers: [HouseholdController],
  providers: [
    HouseholdRepository,
    HouseholdService,
    { provide: HouseholdMembers, useExisting: HouseholdRepository },
  ],
  exports: [HouseholdMembers],
})
export class HouseholdModule {}
