import { Injectable, NotFoundException } from '@nestjs/common'
import type { TenantSettingsRow } from '@workspace/db'
import type { TenantSettings, UpdateSettingsBody } from '@workspace/poco'

import { SettingsRepository } from './settings.repository.js'

/** Maps a settings row onto the wire shape the session and routes carry. */
export function toWireSettings(row: TenantSettingsRow): TenantSettings {
  return {
    timezone: row.timezone,
    mainCurrency: row.mainCurrency,
    timezoneConfirmed: row.timezoneConfirmed,
  }
}

/**
 * Reads and saves the tenant's global settings. Every tenant has its row
 * from sign-up (or the migration), so a missing row is a 404, never a
 * silent default.
 */
@Injectable()
export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  async get(tenantId: number): Promise<TenantSettings> {
    const row = await this.settings.findByTenant(tenantId)
    if (row === undefined) {
      throw new NotFoundException('Settings not found.')
    }

    return toWireSettings(row)
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateSettingsBody
  ): Promise<TenantSettings> {
    const row = await this.settings.update(tenantId, userId, body)
    if (row === undefined) {
      throw new NotFoundException('Settings not found.')
    }

    return toWireSettings(row)
  }
}
