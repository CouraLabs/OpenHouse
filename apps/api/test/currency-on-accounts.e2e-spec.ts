import { readdirSync, readFileSync } from 'node:fs'
import type { INestApplication } from '@nestjs/common'
import { getDrizzleToken } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import { sql } from 'drizzle-orm'
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

describe('the currency-on-accounts migration (e2e, #19)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  /** The mismatch check the migration runs before dropping any column. */
  const mismatchCheck = (): string => {
    const drizzle = new URL('../../../packages/db/drizzle/', import.meta.url)
    const folder = readdirSync(drizzle).find((name) =>
      name.endsWith('_currency-on-accounts')
    )
    const migration = readFileSync(
      new URL(`${folder}/migration.sql`, drizzle),
      'utf8'
    )

    return migration.split('--> statement-breakpoint')[0]
  }

  /**
   * Runs the check against scratch temp tables — they shadow the real ones
   * inside the session and drop themselves when the transaction ends — and
   * answers the error the check raised, if any.
   */
  const runCheck = async (seed: {
    goals: Array<[number, number, string, string]>
    limits: Array<[number, number, string, string]>
  }): Promise<string | undefined> => {
    const db = app.get<Database>(getDrizzleToken())

    try {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`create temp table tenant_settings (tenant_id int, main_currency text) on commit drop`
        )
        await tx.execute(
          sql`insert into tenant_settings values (1, 'BRL'), (2, 'USD')`
        )
        for (const table of ['goals', 'limits']) {
          await tx.execute(
            sql.raw(
              `create temp table ${table} (tenant_id int, id int, currency text, status text) on commit drop`
            )
          )
        }
        for (const [tenantId, id, currency, status] of seed.goals) {
          await tx.execute(
            sql`insert into goals values (${tenantId}, ${id}, ${currency}, ${status})`
          )
        }
        for (const [tenantId, id, currency, status] of seed.limits) {
          await tx.execute(
            sql`insert into limits values (${tenantId}, ${id}, ${currency}, ${status})`
          )
        }
        await tx.execute(sql.raw(mismatchCheck()))
      })

      return undefined
    } catch (error) {
      const cause = (error as { cause?: Error }).cause

      return (cause ?? (error as Error)).message
    }
  }

  it('refuses to run, listing the rows, when a goal or limit is in another currency', async () => {
    const raised = await runCheck({
      goals: [
        [1, 10, 'BRL', 'ACTIVE'],
        [1, 11, 'USD', 'ACTIVE'],
      ],
      limits: [
        [2, 20, 'EUR', 'ACTIVE'],
        [2, 21, 'USD', 'ACTIVE'],
      ],
    })

    expect(raised).toMatch(/tenant 1 goal 11 \(USD\)/)
    expect(raised).toMatch(/tenant 2 limit 20 \(EUR\)/)
    expect(raised).not.toMatch(/goal 10|limit 21/)
  })

  it('runs when every ACTIVE row is in its main currency — deleted ones aside', async () => {
    expect(
      await runCheck({
        goals: [
          [1, 10, 'BRL', 'ACTIVE'],
          [1, 12, 'EUR', 'DELETED'],
        ],
        limits: [[2, 21, 'USD', 'ACTIVE']],
      })
    ).toBeUndefined()
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
