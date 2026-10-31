import { describe, expect, it } from 'vitest'
import { isSupportedTimeZone } from '@workspace/domain'
import { updateSettingsSchema } from '@workspace/dto'
import { currencyForLocale, dayIn, todayIn } from './settings.js'

describe('isSupportedTimeZone', () => {
  it('accepts IANA zones and UTC', () => {
    expect(isSupportedTimeZone('America/Sao_Paulo')).toBe(true)
    expect(isSupportedTimeZone('Europe/Lisbon')).toBe(true)
    expect(isSupportedTimeZone('UTC')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isSupportedTimeZone('Mars/Olympus_Mons')).toBe(false)
    expect(isSupportedTimeZone('')).toBe(false)
  })
})

describe('updateSettingsSchema', () => {
  it('rejects an unknown zone and an unsupported currency', () => {
    expect(
      updateSettingsSchema.safeParse({ timezone: 'Nope', mainCurrency: 'USD' })
        .success
    ).toBe(false)
    expect(
      updateSettingsSchema.safeParse({ timezone: 'UTC', mainCurrency: 'JPY' })
        .success
    ).toBe(false)
  })
})

describe('dayIn and todayIn', () => {
  it('reads the calendar day of the zone, not of UTC', () => {
    const instant = new Date('2026-10-15T01:00:00Z')

    expect(dayIn(instant, 'America/Sao_Paulo')).toBe('2026-10-14')
    expect(dayIn(instant, 'UTC')).toBe('2026-10-15')
    expect(todayIn('Asia/Tokyo', instant)).toBe('2026-10-15')
  })
})

describe('currencyForLocale', () => {
  it('maps Brazil to BRL, the eurozone to EUR, the rest to USD', () => {
    expect(currencyForLocale('pt-BR')).toBe('BRL')
    expect(currencyForLocale('en-US')).toBe('USD')
    expect(currencyForLocale('de-DE')).toBe('EUR')
    expect(currencyForLocale('pt-PT')).toBe('EUR')
    expect(currencyForLocale('fr')).toBe('EUR')
    expect(currencyForLocale('en-GB')).toBe('USD')
    expect(currencyForLocale('ja')).toBe('USD')
  })
})
