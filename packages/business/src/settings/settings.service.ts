import type { SettingsRepository, TenantSettingsRow } from '@workspace/db'
import type {
  CurrencyChangeConflict,
  SettingsDefaults,
  TenantSettings,
  UpdateSettingsBody,
} from '@workspace/dto'
import { ConflictError, NotFoundError } from '../errors.js'
import type { Clock } from '../ports/clock.js'
import { currencyForLocale, todayIn } from './settings.js'

const defaultClock: Clock = {
  now: () => new Date(),
}

export function toWireSettings(
  row: TenantSettingsRow,
  now: Date = new Date()
): TenantSettings {
  return {
    timezone: row.timezone,
    mainCurrency: row.mainCurrency,
    timezoneConfirmed: row.timezoneConfirmed,
    unsplitMode: row.unsplitMode,
    today: todayIn(row.timezone, now),
  }
}

export class SettingsService {
  constructor(
    private readonly settings: SettingsRepository,
    private readonly clock: Clock = defaultClock
  ) {}

  defaults(locale?: string): SettingsDefaults {
    return {
      mainCurrency: currencyForLocale(locale ?? 'en-US'),
    }
  }

  async get(tenantId: number): Promise<TenantSettings> {
    const row = await this.settings.findByTenant(tenantId)
    if (row === undefined) {
      throw new NotFoundError('Settings not found.')
    }

    return toWireSettings(row, this.clock.now())
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

    return toWireSettings(row, this.clock.now())
  }
}
