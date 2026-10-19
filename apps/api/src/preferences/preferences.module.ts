import { Module } from '@nestjs/common'

import { PreferencesController } from './preferences.controller.js'
import { PreferencesRepository } from './preferences.repository.js'
import { PreferencesService } from './preferences.service.js'

/** The signed-in user's own preferences routes. */
@Module({
  controllers: [PreferencesController],
  providers: [PreferencesRepository, PreferencesService],
})
export class PreferencesModule {}
