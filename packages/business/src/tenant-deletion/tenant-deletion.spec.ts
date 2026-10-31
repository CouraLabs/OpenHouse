import { describe, expect, it } from 'vitest'
import { scheduleTenantDeletionSchema } from '@workspace/dto'
import {
  deletionDateFrom,
  isDeletionDue,
  tenantNameMatches,
} from './tenant-deletion.js'

describe('tenant deletion contract', () => {
  it('schedules the deletion 30 days after the day it was asked', () => {
    expect(deletionDateFrom('2026-10-23')).toBe('2026-11-22')
    expect(deletionDateFrom('2026-12-15')).toBe('2027-01-14')
    expect(deletionDateFrom('2028-01-30')).toBe('2028-02-29')
  })

  it('is due on the deletion day and after, never before', () => {
    expect(isDeletionDue('2026-11-22', '2026-11-21')).toBe(false)
    expect(isDeletionDue('2026-11-22', '2026-11-22')).toBe(true)
    expect(isDeletionDue('2026-11-22', '2026-12-01')).toBe(true)
  })

  it('matches the typed tenant name exactly, ignoring surrounding spaces', () => {
    expect(tenantNameMatches('  Casa Silva ', 'Casa Silva')).toBe(true)
    expect(tenantNameMatches('casa silva', 'Casa Silva')).toBe(false)
    expect(tenantNameMatches('Casa', 'Casa Silva')).toBe(false)
  })

  it('rejects an empty typed name', () => {
    expect(
      scheduleTenantDeletionSchema.safeParse({ tenantName: ' ' }).success
    ).toBe(false)
  })
})
