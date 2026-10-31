import { describe, expect, it } from 'vitest'

import { TenantToday } from './tenant-today.js'

const clock = { now: () => new Date('2026-03-01T02:30:00.000Z') }

function settingsIn(timezone: string | undefined) {
  return {
    findByTenant: async () =>
      timezone === undefined ? undefined : ({ timezone } as never),
  }
}

describe('TenantToday', () => {
  it("reads today in the tenant's time zone", async () => {
    const today = new TenantToday(settingsIn('America/Sao_Paulo'), clock)

    await expect(today.of(1)).resolves.toBe('2026-02-28')
  })

  it('falls back to UTC when the tenant has no settings', async () => {
    const today = new TenantToday(settingsIn(undefined), clock)

    await expect(today.of(1)).resolves.toBe('2026-03-01')
  })
})
