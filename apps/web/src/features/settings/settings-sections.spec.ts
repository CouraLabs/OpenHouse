import { describe, expect, it } from 'vitest'

import { isSectionFor, sectionsFor } from './settings-sections.js'

describe('settings sections', () => {
  it('gives an owner every section and a member only their own', () => {
    expect(sectionsFor('owner')).toEqual([
      'general',
      'users',
      'data',
      'preferences',
      'security',
    ])
    expect(sectionsFor('user')).toEqual(['preferences', 'security'])
  })

  it('refuses the owner sections to a member', () => {
    expect(isSectionFor('user', 'general')).toBe(false)
    expect(isSectionFor('user', 'users')).toBe(false)
    expect(isSectionFor('user', 'data')).toBe(false)
    expect(isSectionFor('user', 'preferences')).toBe(true)
    expect(isSectionFor('user', 'security')).toBe(true)
    expect(isSectionFor('owner', 'nope')).toBe(false)
  })
})
