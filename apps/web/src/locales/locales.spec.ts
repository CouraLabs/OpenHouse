import { beforeEach, describe, expect, it } from 'vitest'

import enUS from './en-US.json'
import ptBR from './pt-BR.json'
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectBrowserLocale,
  resolveInitialLocale,
} from '@/lib/i18n.js'

function collectLeaves(
  obj: Record<string, unknown>,
  path = ''
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const current = path ? `${path}.${key}` : key
    if (typeof value === 'object' && value !== null) {
      Object.assign(
        result,
        collectLeaves(value as Record<string, unknown>, current)
      )
    } else if (typeof value === 'string') {
      result[current] = value
    }
  }
  return result
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g)
  return matches ? [...matches].sort() : []
}

function createMemoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string) {
      return store.get(key) ?? null
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
}

describe('locales parity', () => {
  const enLeaves = collectLeaves(enUS as Record<string, unknown>)
  const ptLeaves = collectLeaves(ptBR as Record<string, unknown>)

  it('exposes en-US and pt-BR in supported locales with pt-BR as default', () => {
    expect(SUPPORTED_LOCALES).toContain('en-US')
    expect(SUPPORTED_LOCALES).toContain('pt-BR')
    expect(DEFAULT_LOCALE).toBe('pt-BR')
  })

  it('has identical keys in en-US and pt-BR', () => {
    const enKeys = Object.keys(enLeaves).sort()
    const ptKeys = Object.keys(ptLeaves).sort()

    expect(ptKeys).toEqual(enKeys)
  })

  it('has matching interpolation placeholders for every key', () => {
    for (const [key, enText] of Object.entries(enLeaves)) {
      const ptText = ptLeaves[key]
      expect(ptText).toBeDefined()
      expect(extractPlaceholders(ptText!)).toEqual(extractPlaceholders(enText))
    }
  })
})

describe('locale resolution and storage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('detects English tags correctly', () => {
    expect(detectBrowserLocale(['en-US'])).toBe('en-US')
    expect(detectBrowserLocale(['en-GB'])).toBe('en-US')
    expect(detectBrowserLocale(['en'])).toBe('en-US')
  })

  it('detects Portuguese tags correctly', () => {
    expect(detectBrowserLocale(['pt-BR'])).toBe('pt-BR')
    expect(detectBrowserLocale(['pt-PT'])).toBe('pt-BR')
    expect(detectBrowserLocale(['pt'])).toBe('pt-BR')
  })

  it('returns null for unsupported languages', () => {
    expect(detectBrowserLocale(['fr-FR', 'de-DE', 'ja'])).toBeNull()
    expect(detectBrowserLocale([])).toBeNull()
  })

  it('persists fallback to storage when no stored preference exists and browser language is unsupported', () => {
    const initial = resolveInitialLocale(storage, ['fr-FR'])
    expect(initial).toBe('pt-BR')
    expect(storage.getItem('locale')).toBe('pt-BR')
  })

  it('persists detected language to storage when no stored preference exists', () => {
    const initial = resolveInitialLocale(storage, ['en-US'])
    expect(initial).toBe('en-US')
    expect(storage.getItem('locale')).toBe('en-US')
  })

  it('honors existing valid storage preference over browser language', () => {
    storage.setItem('locale', 'en-US')

    const initial = resolveInitialLocale(storage, ['pt-BR'])
    expect(initial).toBe('en-US')
  })
})
