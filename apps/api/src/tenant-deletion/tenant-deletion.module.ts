import { Module } from '@nestjs/common'

import { SettingsModule } from '../settings/settings.module.js'
import { TenantDeletionController } from './tenant-deletion.controller.js'
import { TenantDeletionRepository } from './tenant-deletion.repository.js'
import { TenantDeletionService } from './tenant-deletion.service.js'

/** The tenant deletion routes and the daily job that carries it out. */
@Module({
  imports: [SettingsModule],
  controllers: [TenantDeletionController],
  providers: [TenantDeletionRepository, TenantDeletionService],
})
export class TenantDeletionModule {}
