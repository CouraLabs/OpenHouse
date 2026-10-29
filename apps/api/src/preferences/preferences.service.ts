import {
  toStartPage,
  type UpdatePreferencesBody,
  type UserPreferences,
} from '@workspace/poco'

import { NotFoundError } from '../common/errors.js'
import { PreferencesRepository } from './preferences.repository.js'

/** Saves the signed-in user's own preferences. */
export class PreferencesService {
  constructor(private readonly preferences: PreferencesRepository) {}

  async update(
    tenantId: number,
    userId: number,
    body: UpdatePreferencesBody
  ): Promise<UserPreferences> {
    const row = await this.preferences.update(tenantId, userId, body)
    if (row === undefined) {
      throw new NotFoundError('User not found.')
    }

    return { startPage: toStartPage(row.startPage) }
  }
}
