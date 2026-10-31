import { env } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

describe('business workerd harness', () => {
  it('resolves the D1 binding', async () => {
    const db = (env as unknown as { DB: D1Database }).DB
    const row = await db.prepare('select 1 as one').first<{ one: number }>()
    expect(row?.one).toBe(1)
  })
})
