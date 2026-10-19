import { Body, Controller, Get, Put } from '@nestjs/common'
import {
  updateSettingsSchema,
  type TenantSettings,
  type UpdateSettingsBody,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import {
  CurrentSession,
  Roles,
  type Session,
} from '../common/session/session.js'
import { SettingsService } from './settings.service.js'

/**
 * The tenant's global settings. Every signed-in user reads them — members
 * need the time zone and main currency for correct defaults — and only an
 * owner changes them.
 */
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentSession() session: Session): Promise<TenantSettings> {
    return this.settings.get(session.tenant.id)
  }

  @Roles('owner')
  @Put()
  update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateSettingsSchema)) body: UpdateSettingsBody
  ): Promise<TenantSettings> {
    return this.settings.update(session.tenant.id, session.user.id, body)
  }
}
