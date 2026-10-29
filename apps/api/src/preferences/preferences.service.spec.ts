import { NotFoundError } from '../common/errors.js'
import { describe, expect, it, vi } from 'vitest'

import type { PreferencesRepository } from './preferences.repository.js'
import { PreferencesService } from './preferences.service.js'

const service = (update: ReturnType<typeof vi.fn>) =>
  new PreferencesService({ update } as unknown as PreferencesRepository)

describe('PreferencesService.update', () => {
  it('saves the start page of the user in their tenant', async () => {
    const update = vi.fn(async () => ({ startPage: '/transactions' }))

    const saved = await service(update).update(1, 2, {
      startPage: '/transactions',
    })

    expect(saved).toEqual({ startPage: '/transactions' })
    expect(update).toHaveBeenCalledWith(1, 2, { startPage: '/transactions' })
  })

  it('answers 404 when the user is not in the tenant', async () => {
    const update = vi.fn(async () => undefined)

    await expect(
      service(update).update(1, 99, { startPage: '/' })
    ).rejects.toThrow(NotFoundError)
  })
})
