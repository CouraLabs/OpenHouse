import { describe, expect, it } from 'vitest'

import {
  createAccount,
  createCategory,
  joinAsMember,
  signUp,
  startApp,
} from './support.js'

/**
 * The isolation boundary: every search route answers only the session's
 * tenant's rows. Tenant B's session must never read tenant A's rows on any
 * `POST <entity>/search` — the repository takes the tenant from the session
 * (rule 6a), never from the request.
 */

/** The search routes, with the body a page of rows asks for. */
const SEARCHES: Array<[string, Record<string, unknown>]> = [
  ['/api/accounts/search', {}],
  ['/api/categories/search', {}],
  ['/api/receivers/search', {}],
  ['/api/goals/search', {}],
  ['/api/limits/search', {}],
  ['/api/transaction-linkers/search', {}],
  ['/api/recurring-transactions/search', {}],
  ['/api/transactions/search', {}],
  ['/api/credit-card-statements/search', {}],
]

describe('tenant isolation (e2e)', () => {
  it("tenant B's session reads none of tenant A's rows on any search", async () => {
    const app = startApp().app

    const ownerA = await signUp(app)
    const accountIdA = await createAccount(ownerA, { name: 'A-only account' })
    const categoryIdA = await createCategory(ownerA)

    const ownerB = await signUp(app)
    const { agent: memberB } = await joinAsMember(app, ownerB)

    for (const [route, filter] of SEARCHES) {
      const response = await memberB.post(route, { sort: [], filter, limit: 100 })

      expect(response.status, route).toBe(201)

      const ids = (response.body.items as Array<{ id: number }>).map((row) => row.id)

      expect(ids, route).not.toContain(accountIdA)
      expect(ids, route).not.toContain(categoryIdA)
    }
  })

  it("a row of tenant A is invisible by id to tenant B's session", async () => {
    const app = startApp().app

    const ownerA = await signUp(app)
    const accountIdA = await createAccount(ownerA)

    const ownerB = await signUp(app)
    const { agent: memberB } = await joinAsMember(app, ownerB)

    const read = await memberB.get(`/api/accounts/${accountIdA}`)
    expect(read.status).toBe(404)

    // An edit naming another tenant's id may fail validation or lookup —
    // either way it never succeeds.
    const edit = await memberB.put('/api/accounts', {
      id: accountIdA,
      name: 'stolen',
    })
    expect(edit.status).toBeGreaterThanOrEqual(400)
    expect(edit.status).toBeLessThan(500)
  })

  it('answers 401 without a session on every search', async () => {
    const app = startApp().app

    for (const [route] of SEARCHES) {
      const response = await app.request(route, { method: 'POST' })
      expect(response.status, route).toBe(401)
    }
  })

})
