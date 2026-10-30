import { describe, expect, it } from 'vitest'

import { formatInput, parseInput } from './money-input'

describe('parseInput', () => {
  it('reads a whole number as whole units, not cents', () => {
    expect(parseInput('12')).toBe('12.00')
  })

  it('reads one decimal digit', () => {
    expect(parseInput('12.5')).toBe('12.50')
  })

  it('accepts a comma as the decimal separator', () => {
    expect(parseInput('12,50')).toBe('12.50')
  })

  it('reads a European grouped amount', () => {
    expect(parseInput('1.234,56')).toBe('1234.56')
  })

  it('reads an American grouped amount', () => {
    expect(parseInput('1,234.56')).toBe('1234.56')
  })

  it('uses the locale to read an ambiguous group', () => {
    expect(parseInput('1.234', 'pt-BR')).toBe('1234.00')
    expect(parseInput('1.234', 'en-US')).toBe('1.23')
  })

  it('keeps a negative sign', () => {
    expect(parseInput('-45.5')).toBe('-45.50')
  })

  it('allows an explicit zero without a sign', () => {
    expect(parseInput('0')).toBe('0.00')
    expect(parseInput('-0')).toBe('0.00')
  })

  it('returns an empty string for empty or non-numeric input', () => {
    expect(parseInput('')).toBe('')
    expect(parseInput('abc')).toBe('')
  })

  it('drops extra fraction digits', () => {
    expect(parseInput('1.239')).toBe('1.23')
  })
})

describe('formatInput', () => {
  it('formats with the locale separators', () => {
    expect(formatInput('1234.56', 'en-US')).toBe('1,234.56')
    expect(formatInput('1234.56', 'pt-BR')).toBe('1.234,56')
    expect(formatInput('-5.00', 'en-US')).toBe('-5.00')
  })

  it('returns an empty string for no value', () => {
    expect(formatInput(undefined, 'en-US')).toBe('')
  })
})
