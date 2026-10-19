import { ConflictException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { TenantSettingsRow } from '@workspace/db'

import { SettingsRepository } from './settings.repository.js'
import { SettingsService } from './settings.service.js'

/** The tenant's stored settings: São Paulo, in BRL. */
const current: TenantSettingsRow = {
  tenantId: 1,
  timezone: 'America/Sao_Paulo',
  mainCurrency: 'BRL',
  timezoneConfirmed: true,
  updateBy: null,
  updateDt: new Date('2026-01-01T00:00:00Z'),
}

/** A repository mock whose tenant holds `affected` limits and goals. */
const repository = (
  affected = { limits: 3, goals: 1, goalsOffCurrency: 1 }
) => ({
  findByTenant: vi.fn(async () => current),
  countDenominated: vi.fn(async () => affected),
  update: vi.fn(
    async (
      _tenantId: number,
      _userId: number,
      data: Pick<TenantSettingsRow, 'timezone' | 'mainCurrency'>
    ) => ({ ...current, ...data })
  ),
})

const serviceWith = (repo: ReturnType<typeof repository>) =>
  new SettingsService(repo as unknown as SettingsRepository)

describe('SettingsService', () => {
  it('answers 409 with the counts when the main currency changes unconfirmed', async () => {
    const repo = repository()

    const attempt = serviceWith(repo).update(1, 7, {
      timezone: current.timezone,
      mainCurrency: 'USD',
    })

    await expect(attempt).rejects.toThrow(ConflictException)
    await attempt.catch((error: ConflictException) => {
      expect(error.getResponse()).toMatchObject({
        limits: 3,
        goals: 1,
        goalsOffCurrency: 1,
      })
    })
    expect(repo.countDenominated).toHaveBeenCalledWith(1, 'USD')
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('changes the main currency once the body confirms it', async () => {
    const repo = repository()

    const saved = await serviceWith(repo).update(1, 7, {
      timezone: current.timezone,
      mainCurrency: 'USD',
      confirmCurrencyChange: true,
    })

    expect(saved.mainCurrency).toBe('USD')
    expect(repo.update).toHaveBeenCalledWith(1, 7, {
      timezone: current.timezone,
      mainCurrency: 'USD',
    })
  })

  it('changes it without asking when nothing is denominated in it', async () => {
    const repo = repository({ limits: 0, goals: 0, goalsOffCurrency: 0 })

    const saved = await serviceWith(repo).update(1, 7, {
      timezone: current.timezone,
      mainCurrency: 'EUR',
    })

    expect(saved.mainCurrency).toBe('EUR')
  })

  it('saves the time zone alone without counting anything', async () => {
    const repo = repository()

    await serviceWith(repo).update(1, 7, {
      timezone: 'UTC',
      mainCurrency: 'BRL',
    })

    expect(repo.countDenominated).not.toHaveBeenCalled()
    expect(repo.update).toHaveBeenCalled()
  })
})
