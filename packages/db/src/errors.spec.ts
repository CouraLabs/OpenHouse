import { describe, expect, it } from 'vitest'
import { isUniqueViolation } from './errors.js'

describe('isUniqueViolation', () => {
  it('reads the columns of a D1 single-column constraint', () => {
    const error = new Error(
      'D1_ERROR: UNIQUE constraint failed: tenants.name: SQLITE_CONSTRAINT'
    )

    expect(isUniqueViolation(error, 'tenants', ['name'])).toBe(true)
    expect(isUniqueViolation(error, 'tenants')).toBe(true)
    expect(isUniqueViolation(error, 'tenants', ['slug'])).toBe(false)
    expect(isUniqueViolation(error, 'users', ['name'])).toBe(false)
  })

  it('reads every column of a composite constraint', () => {
    const error = new Error(
      'UNIQUE constraint failed: users.tenant_id, users.email'
    )

    expect(isUniqueViolation(error, 'users', ['tenant_id', 'email'])).toBe(true)
    expect(isUniqueViolation(error, 'users', ['name'])).toBe(false)
  })
})
