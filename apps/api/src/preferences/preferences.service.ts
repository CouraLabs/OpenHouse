import { Injectable, NotFoundException } from '@nestjs/common'
import {
  toStartPage,
  type UpdatePreferencesBody,
  type UserPreferences,
} from '@workspace/poco'

import { PreferencesRepository } from './preferences.repository.js'

/** Saves the signed-in user's own preferences. */
@Injectable()
export class PreferencesService {
  constructor(private readonly preferences: PreferencesRepository) {}

  async update(
    tenantId: number,
    userId: number,
    body: UpdatePreferencesBody
  ): Promise<UserPreferences> {
    const row = await this.preferences.update(tenantId, userId, body)
    if (row === undefined) {
      throw new NotFoundException('User not found.')
    }

    return { startPage: toStartPage(row.startPage) }
  }
}
