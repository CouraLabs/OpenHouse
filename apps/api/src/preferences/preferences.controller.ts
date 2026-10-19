import { Body, Controller, Put } from '@nestjs/common'
import {
  updatePreferencesSchema,
  type UpdatePreferencesBody,
  type UserPreferences,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import { CurrentSession, type Session } from '../common/session/session.js'
import { PreferencesService } from './preferences.service.js'

/**
 * The signed-in user's own preferences. Any role writes its own; the
 * session carries them on read, so there is no `GET`.
 */
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Put()
  update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updatePreferencesSchema))
    body: UpdatePreferencesBody
  ): Promise<UserPreferences> {
    return this.preferences.update(session.tenant.id, session.user.id, body)
  }
}
