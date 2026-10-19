import { describe, expect, it } from 'vitest'

import {
  generateResetCode,
  hashesMatch,
  hashResetCode,
  isWellFormedResetCode,
  normalizeResetCode,
  RESET_CODE_ALPHABET,
  resetCodePrefix,
} from './reset-code.js'

describe('reset codes', () => {
  it('generates XXXXX-XXXXX from the unambiguous alphabet', () => {
    for (let run = 0; run < 50; run += 1) {
      const code = generateResetCode()

      expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/)
      expect(code).not.toMatch(/[01OIL]/)
      expect(isWellFormedResetCode(normalizeResetCode(code))).toBe(true)
    }
  })

  it('leaves out the characters a person misreads', () => {
    for (const char of ['0', 'O', '1', 'I', 'L']) {
      expect(RESET_CODE_ALPHABET).not.toContain(char)
    }
  })

  it('normalizes case, hyphens, and whitespace before hashing', () => {
    expect(normalizeResetCode(' abcde-fghjk ')).toBe('ABCDEFGHJK')
    expect(hashResetCode('abcde-fghjk')).toBe(hashResetCode('ABCDEFGHJK'))
    expect(hashResetCode('ABCDE-FGHJK')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('never hashes to anything containing the code', () => {
    const code = generateResetCode()

    expect(hashResetCode(code)).not.toContain(normalizeResetCode(code))
  })

  it('compares hashes in constant time, rejecting a mismatch', () => {
    const hash = hashResetCode('ABCDE-FGHJK')

    expect(hashesMatch(hash, hashResetCode('abcde fghjk'))).toBe(true)
    expect(hashesMatch(hash, hashResetCode('ABCDE-FGHJM'))).toBe(false)
    expect(hashesMatch(hash, 'ab')).toBe(false)
  })

  it('rejects shapes no generated code has', () => {
    expect(isWellFormedResetCode('ABCDE')).toBe(false)
    expect(isWellFormedResetCode('ABCDEFGHI0')).toBe(false)
    expect(resetCodePrefix('ABCDEFGHJK')).toBe('ABCDE')
  })
})
