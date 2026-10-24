import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { TenantSettingsRow } from '@workspace/db'
import type {
  CurrencyChangeConflict,
  TenantSettings,
  UpdateSettingsBody,
} from '@workspace/poco'

import { SettingsRepository } from './settings.repository.js'

/** Maps a settings row onto the wire shape the session and routes carry. */
export function toWireSettings(row: TenantSettingsRow): TenantSettings {
  return {
    timezone: row.timezone,
    mainCurrency: row.mainCurrency,
    timezoneConfirmed: row.timezoneConfirmed,
    unsplitMode: row.unsplitMode,
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

  /**
   * Saves the settings. Limits and goals are denominated in the main
   * currency, so changing it re-denominates them without converting any
   * amount: unless the body confirms it, a change that would touch any of
   * them answers 409 with their counts, for the owner to confirm.
   */
  async update(
    tenantId: number,
    userId: number,
    body: UpdateSettingsBody
  ): Promise<TenantSettings> {
    const current = await this.settings.findByTenant(tenantId)
    if (current === undefined) {
      throw new NotFoundException('Settings not found.')
    }

    if (
      body.mainCurrency !== current.mainCurrency &&
      body.confirmCurrencyChange !== true
    ) {
      const affected = await this.settings.countDenominated(
        tenantId,
        body.mainCurrency
      )

      if (affected.limits > 0 || affected.goals > 0) {
        const conflict: CurrencyChangeConflict = {
          message: `Your limits and goals will be read as ${body.mainCurrency}. Amounts are not converted.`,
          ...affected,
        }

        throw new ConflictException(conflict)
      }
    }

    const row = await this.settings.update(tenantId, userId, {
      timezone: body.timezone,
      mainCurrency: body.mainCurrency,
      ...(body.unsplitMode === undefined
        ? {}
        : { unsplitMode: body.unsplitMode }),
    })
    if (row === undefined) {
      throw new NotFoundException('Settings not found.')
    }

    return toWireSettings(row)
  }
}
