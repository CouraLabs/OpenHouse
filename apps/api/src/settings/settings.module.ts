import { Module } from '@nestjs/common'

import { SettingsController } from './settings.controller.js'
import { SettingsRepository } from './settings.repository.js'
import { SettingsService } from './settings.service.js'

/**
 * The tenant settings routes. `SettingsRepository` is exported so the
 * recurring job reads each tenant's time zone and the sign-up seeds a new
 * tenant's row — the sanctioned module-level crossing.
 */
@Module({
  controllers: [SettingsController],
  providers: [SettingsRepository, SettingsService],
  exports: [SettingsRepository],
})
export class SettingsModule {}
