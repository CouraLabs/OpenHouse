import type { PreferencesRepository } from '@workspace/db'
import type { UpdatePreferencesBody, UserPreferences } from '@workspace/dto'
import { NotFoundError } from '../errors.js'
import { toStartPage } from './preferences.js'

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
