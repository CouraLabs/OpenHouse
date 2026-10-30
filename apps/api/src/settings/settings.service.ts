import type { TenantSettingsRow } from '@workspace/db'
import type {
  CurrencyChangeConflict,
  TenantSettings,
  UpdateSettingsBody,
} from '@workspace/poco'

import { ConflictError, NotFoundError } from '../common/errors.js'
import { SettingsRepository } from './settings.repository.js'

export function toWireSettings(row: TenantSettingsRow): TenantSettings {
  return {
    timezone: row.timezone,
    mainCurrency: row.mainCurrency,
    timezoneConfirmed: row.timezoneConfirmed,
    unsplitMode: row.unsplitMode,
  }
}

export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  async get(tenantId: number): Promise<TenantSettings> {
    const row = await this.settings.findByTenant(tenantId)
    if (row === undefined) {
      throw new NotFoundError('Settings not found.')
    }

    return toWireSettings(row)
  }

  async update(
    tenantId: number,
    userId: number,
    body: UpdateSettingsBody
  ): Promise<TenantSettings> {
    const current = await this.settings.findByTenant(tenantId)
    if (current === undefined) {
      throw new NotFoundError('Settings not found.')
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

        throw new ConflictError(conflict)
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
      throw new NotFoundError('Settings not found.')
    }

    return toWireSettings(row)
  }
}
