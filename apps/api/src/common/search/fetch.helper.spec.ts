import { describe, expect, it } from 'vitest'
import { asc, desc, sql } from 'drizzle-orm'
import type { FetchArgs } from '@workspace/poco'

import {
  buildPagedQuery,
  escapeLikePattern,
  type SortableColumns,
} from './fetch.helper.js'

/** Columns that stand in for a feature's whitelist. */
const columns = {
  name: { name: 'name' },
  createdDt: { name: 'created_dt' },
} as unknown as SortableColumns

const args = (overrides: Partial<FetchArgs> = {}): FetchArgs => ({
  sort: [],
  filter: {},
  skip: 0,
  limit: 20,
  ...overrides,
})

describe('buildPagedQuery', () => {
  it('passes the filter through untouched and applies the paging defaults', () => {
    const filter = sql`status = 'ACTIVE'`

    const query = buildPagedQuery(args(), filter, columns)

    expect(query.where).toBe(filter)
    expect(query.orderBy).toEqual([])
    expect(query.limit).toBe(20)
    expect(query.offset).toBe(0)
  })

  it('maps whitelisted sort fields to their direction', () => {
    const query = buildPagedQuery(
      args({
        sort: [
          { field: 'name', dir: 'asc' },
          { field: 'createdDt', dir: 'desc' },
        ],
      }),
      undefined,
      columns
    )

    expect(query.orderBy).toEqual([asc(columns.name), desc(columns.createdDt)])
  })

  it('drops sort fields outside the whitelist instead of failing the page', () => {
    const query = buildPagedQuery(
      args({
        sort: [
          { field: 'password_hash', dir: 'asc' },
          { field: 'name', dir: 'desc' },
        ],
      }),
      undefined,
      columns
    )

    expect(query.orderBy).toEqual([desc(columns.name)])
  })

  it('carries skip and limit through as offset and limit', () => {
    const query = buildPagedQuery(
      args({ skip: 40, limit: 10 }),
      undefined,
      columns
    )

    expect(query.offset).toBe(40)
    expect(query.limit).toBe(10)
  })
})

describe('escapeLikePattern', () => {
  it.each([
    ['office', 'office'],
    ['100%', '100\\%'],
    ['a_b', 'a\\_b'],
    ['back\\slash', 'back\\\\slash'],
  ])('escapes %p as %p', (raw, escaped) => {
    expect(escapeLikePattern(raw)).toBe(escaped)
  })
})
