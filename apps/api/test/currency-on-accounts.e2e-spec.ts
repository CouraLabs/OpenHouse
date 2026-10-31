import { describe, expect, it } from 'vitest'

import {
  type Agent,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

/** Creates a Savings account in a currency and answers its id. */
function createSavings(agent: Agent, currency: string): Promise<number> {
  return createAccount(agent, { type: 'Savings', currency })
}

/** The body creating a goal on an account. */
function goalOn(linkedAccountId: number) {
  return {
    name: 'Emergency fund',
    linkedAccountId,
    targetBalance: '1000.00',
  }
}

/** Records an expense of `amount` on an account, in a category, today. */
async function spend(
  agent: Agent,
  accountId: number,
  categoryId: number,
  amount: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  const response = await agent.post('/api/transactions', {
    name: 'Groceries',
    amount,
    transactionDt: today,
    linkedAccountId: accountId,
    categoryId,
    type: 'Expense',
  })
  expect(response.status).toBe(201)
}

describe('currency lives on accounts (e2e, #19)', () => {
  it('denominates goals and limits in the main currency, never their own', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const savings = await createSavings(owner, 'USD')
    const categoryId = await createCategory(owner)

    const goal = await owner.post('/api/goals', {
      // A stray currency is not part of the contract any more: ignored.
      ...goalOn(savings),
      currency: 'EUR',
    })
    expect(goal.status).toBe(201)
    const limit = await owner.post('/api/limits', {
      categoryId,
      amount: '50.00',
      type: 'Monthly',
      currency: 'EUR',
    })
    expect(limit.status).toBe(201)

    expect(goal.body.currency).toBe('USD')
    expect(goal.body.accountCurrency).toBe('USD')
    expect(limit.body.currency).toBe('USD')
  })

  it('refuses a goal on an account outside the main currency with 409', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const brl = await createSavings(owner, 'BRL')

    const response = await owner.post('/api/goals', goalOn(brl))

    expect(response.status).toBe(409)
    expect(response.body.message).toBe(
      'This account is in BRL; goals use your main currency (USD).'
    )
  })

  it('counts only main-currency expenses against a limit and reports the rest', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const usd = await createAccount(owner, { currency: 'USD' })
    const brl = await createAccount(owner, { currency: 'BRL' })
    const categoryId = await createCategory(owner)
    const limit = await owner.post('/api/limits', {
      categoryId,
      amount: '100.00',
      type: 'Monthly',
    })
    expect(limit.status).toBe(201)

    await spend(owner, usd, categoryId, '10.00')
    await spend(owner, usd, categoryId, '5.50')
    await spend(owner, brl, categoryId, '99.00')
    await spend(owner, brl, categoryId, '1.00')

    const usage = await owner.get('/api/limits/usage')

    expect(usage.status).toBe(200)
    expect(usage.body).toHaveLength(1)
    expect(usage.body[0]).toMatchObject({
      currency: 'USD',
      spent: '15.50',
      excludedCount: 2,
    })
  })

  it('asks before the main currency re-denominates limits and goals', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const savings = await createSavings(owner, 'USD')
    const categoryId = await createCategory(owner)
    const goal = await owner.post('/api/goals', goalOn(savings))
    expect(goal.status).toBe(201)
    const limit = await owner.post('/api/limits', {
      categoryId,
      amount: '50.00',
      type: 'Monthly',
    })
    expect(limit.status).toBe(201)

    const refused = await owner.put('/api/settings', {
      timezone: 'UTC',
      mainCurrency: 'BRL',
    })
    expect(refused.status).toBe(409)
    expect(refused.body).toMatchObject({
      limits: 1,
      goals: 1,
      goalsOffCurrency: 1,
    })
    // Nothing changed.
    const unchanged = await owner.get('/api/settings')
    expect(unchanged.status).toBe(200)
    expect(unchanged.body.mainCurrency).toBe('USD')

    const confirmed = await owner.put('/api/settings', {
      timezone: 'UTC',
      mainCurrency: 'BRL',
      confirmCurrencyChange: true,
    })
    expect(confirmed.status).toBe(200)

    // The amounts are read in BRL now, unconverted; the goal's account is
    // still USD, which the web shows as a currency mismatch.
    const goals = await owner.post('/api/goals/search', {})
    expect(goals.status).toBe(201)
    expect(goals.body.items[0]).toMatchObject({
      balance: '0.00',
      currency: 'BRL',
      accountCurrency: 'USD',
    })
    const limits = await owner.post('/api/limits/search', {})
    expect(limits.status).toBe(201)
    expect(limits.body.items[0]).toMatchObject({
      amount: '50.00',
      currency: 'BRL',
    })
  })

  it('changes the main currency without asking when nothing is denominated in it', async () => {
    const { app } = startApp()
    const owner = await signUp(app)

    const changed = await owner.put('/api/settings', {
      timezone: 'UTC',
      mainCurrency: 'EUR',
    })

    expect(changed.status).toBe(200)
  })

  it('keeps a spread percentage per account: 0 by default, 0–100, editable', async () => {
    const { app } = startApp()
    const owner = await signUp(app)
    const id = await createAccount(owner)

    const created = await owner.get(`/api/accounts/${id}`)
    expect(created.status).toBe(200)
    expect(created.body.spreadPct).toBe('0.00')

    for (const spreadPct of ['100.01', '4.567', '-1', 'abc']) {
      const refused = await owner.put('/api/accounts', {
        ...accountBody(created.body),
        id,
        spreadPct,
      })
      expect(refused.status).toBe(400)
    }

    const updated = await owner.put('/api/accounts', {
      ...accountBody(created.body),
      id,
      spreadPct: '4',
    })
    expect(updated.status).toBe(200)
    expect(updated.body.spreadPct).toBe('4.00')
  })
})

/** The writable fields of an account read back, as an update body. */
function accountBody(account: Record<string, unknown>) {
  return {
    name: account.name,
    agency: account.agency,
    number: account.number,
    type: account.type,
    balance: account.balance,
    currency: account.currency,
    isDefault: account.isDefault,
  }
}
