
import type { INestApplication } from '@nestjs/common'
import type { App } from 'supertest/types.js'

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
    balance: '100.00',
    balanceDt: '2026-10-01',
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

  await agent
    .post('/transactions')
    .send({
      name: 'Groceries',
      amount,
      transactionDt: today,
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
    })
    .expect(201)
}

describe('currency lives on accounts (e2e, #19)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('denominates goals and limits in the main currency, never their own', async () => {
    const owner = await signUp(app)
    const savings = await createSavings(owner, 'USD')
    const categoryId = await createCategory(owner)

    const goal = await owner
      .post('/goals')
      // A stray currency is not part of the contract any more: ignored.
      .send({ ...goalOn(savings), currency: 'EUR' })
      .expect(201)
    const limit = await owner
      .post('/limits')
      .send({ categoryId, amount: '50.00', type: 'Monthly', currency: 'EUR' })
      .expect(201)

    expect(goal.body.currency).toBe('USD')
    expect(goal.body.accountCurrency).toBe('USD')
    expect(limit.body.currency).toBe('USD')
  })

  it('refuses a goal on an account outside the main currency with 409', async () => {
    const owner = await signUp(app)
    const brl = await createSavings(owner, 'BRL')

    const response = await owner.post('/goals').send(goalOn(brl)).expect(409)

    expect(response.body.message).toBe(
      'This account is in BRL; goals use your main currency (USD).'
    )
  })

  it('counts only main-currency expenses against a limit and reports the rest', async () => {
    const owner = await signUp(app)
    const usd = await createAccount(owner, { currency: 'USD' })
    const brl = await createAccount(owner, { currency: 'BRL' })
    const categoryId = await createCategory(owner)
    await owner
      .post('/limits')
      .send({ categoryId, amount: '100.00', type: 'Monthly' })
      .expect(201)

    await spend(owner, usd, categoryId, '10.00')
    await spend(owner, usd, categoryId, '5.50')
    await spend(owner, brl, categoryId, '99.00')
    await spend(owner, brl, categoryId, '1.00')

    const usage = await owner.get('/limits/usage').expect(200)

    expect(usage.body).toHaveLength(1)
    expect(usage.body[0]).toMatchObject({
      currency: 'USD',
      spent: '15.50',
      excludedCount: 2,
    })
  })

  it('asks before the main currency re-denominates limits and goals', async () => {
    const owner = await signUp(app)
    const savings = await createSavings(owner, 'USD')
    const categoryId = await createCategory(owner)
    await owner.post('/goals').send(goalOn(savings)).expect(201)
    await owner
      .post('/limits')
      .send({ categoryId, amount: '50.00', type: 'Monthly' })
      .expect(201)

    const refused = await owner
      .put('/settings')
      .send({ timezone: 'UTC', mainCurrency: 'BRL' })
      .expect(409)
    expect(refused.body).toMatchObject({
      limits: 1,
      goals: 1,
      goalsOffCurrency: 1,
    })
    // Nothing changed.
    expect((await owner.get('/settings').expect(200)).body.mainCurrency).toBe(
      'USD'
    )

    await owner
      .put('/settings')
      .send({
        timezone: 'UTC',
        mainCurrency: 'BRL',
        confirmCurrencyChange: true,
      })
      .expect(200)

    // The amounts are read in BRL now, unconverted; the goal's account is
    // still USD, which the web shows as a currency mismatch.
    const goals = await owner.post('/goals/search').send({}).expect(201)
    expect(goals.body.items[0]).toMatchObject({
      balance: '100.00',
      currency: 'BRL',
      accountCurrency: 'USD',
    })
    const limits = await owner.post('/limits/search').send({}).expect(201)
    expect(limits.body.items[0]).toMatchObject({
      amount: '50.00',
      currency: 'BRL',
    })
  })

  it('changes the main currency without asking when nothing is denominated in it', async () => {
    const owner = await signUp(app)

    await owner
      .put('/settings')
      .send({ timezone: 'UTC', mainCurrency: 'EUR' })
      .expect(200)
  })

  it('keeps a spread percentage per account: 0 by default, 0–100, editable', async () => {
    const owner = await signUp(app)
    const id = await createAccount(owner)

    const created = await owner.get(`/accounts/${id}`).expect(200)
    expect(created.body.spreadPct).toBe('0.00')

    for (const spreadPct of ['100.01', '4.567', '-1', 'abc']) {
      await owner
        .put('/accounts')
        .send({ ...accountBody(created.body), id, spreadPct })
        .expect(400)
    }

    const updated = await owner
      .put('/accounts')
      .send({ ...accountBody(created.body), id, spreadPct: '4' })
      .expect(200)
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
