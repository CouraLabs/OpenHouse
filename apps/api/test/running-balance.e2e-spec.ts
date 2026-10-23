import type { INestApplication } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { getDrizzleToken } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import { accounts } from '@workspace/db'
import type { App } from 'supertest/types.js'

import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

describe('the chronological running balance (e2e)', () => {
  let app: INestApplication<App>
  let agent: Agent
  let categoryId: number
  let otherCategoryId: number

  beforeAll(async () => {
    app = await startApp()
    agent = await signUp(app)
    categoryId = await createCategory(agent)
    otherCategoryId = await createCategory(agent)
  })

  afterAll(async () => {
    await app.close()
  })

  /** Creates a transaction on an account and answers its id. */
  const add = async (
    accountId: number,
    overrides: Record<string, unknown> = {}
  ): Promise<number> => {
    const response = await agent
      .post('/transactions')
      .send({
        name: 'Entry',
        amount: '100.00',
        transactionDt: '2026-10-10',
        linkedAccountId: accountId,
        categoryId,
        type: 'Expense',
        ...overrides,
      })
      .expect(201)

    return response.body.id
  }

  /** The account's rows in date order with their running balances. */
  const rowsOf = async (
    accountId: number,
    filter: Record<string, unknown> = {}
  ): Promise<Array<{ id: number; runningBalance: string }>> => {
    const response = await agent
      .post('/transactions/search')
      .send({
        sort: [{ field: 'transactionDt', dir: 'asc' }],
        filter: { linkedAccountId: accountId, ...filter },
        limit: 100,
      })
      .expect(201)

    return response.body.items
  }

  it('shows a backdated expense at its place in date order', async () => {
    const accountId = await createAccount(agent, { balance: '1000.00' })
    const oct10 = await add(accountId, { transactionDt: '2026-10-10' })
    const oct5 = await add(accountId, {
      transactionDt: '2026-10-05',
      amount: '50.00',
    })

    const rows = await rowsOf(accountId)

    // Entered second, dated first: 1000 - 50 = 950, then 950 - 100 = 850.
    expect(rows.map((row) => [row.id, row.runningBalance])).toEqual([
      [oct5, '950.00'],
      [oct10, '850.00'],
    ])
    expect(await balanceOf(agent, accountId)).toBe('850.00')
  })

  it('counts Income, and skips Canceled and deleted rows', async () => {
    const accountId = await createAccount(agent, { balance: '100.00' })
    const income = await add(accountId, {
      type: 'Income',
      amount: '40.00',
      transactionDt: '2026-10-01',
    })
    const canceled = await add(accountId, {
      amount: '30.00',
      transactionDt: '2026-10-02',
      status: 'Canceled',
    })
    const kept = await add(accountId, {
      amount: '10.00',
      transactionDt: '2026-10-03',
    })

    const rows = await rowsOf(accountId)

    expect(rows.map((row) => [row.id, row.runningBalance])).toEqual([
      [income, '140.00'],
      [canceled, '140.00'],
      [kept, '130.00'],
    ])

    await agent.delete(`/transactions/${kept}`).expect(204)

    expect(
      (await rowsOf(accountId)).map((row) => row.runningBalance)
    ).toEqual(['140.00', '140.00'])
  })

  it('computes the window before the filters and the paging', async () => {
    const accountId = await createAccount(agent, { balance: '500.00' })
    await add(accountId, {
      amount: '100.00',
      transactionDt: '2026-10-01',
      categoryId: otherCategoryId,
    })
    const groceries = await add(accountId, {
      amount: '20.00',
      transactionDt: '2026-10-02',
    })
    await add(accountId, {
      amount: '60.00',
      transactionDt: '2026-10-03',
      categoryId: otherCategoryId,
    })
    const lastGroceries = await add(accountId, {
      amount: '5.00',
      transactionDt: '2026-10-04',
    })

    // Filtering to one category must not skip the other rows' deltas.
    const filtered = await rowsOf(accountId, { categoryId })

    expect(filtered.map((row) => [row.id, row.runningBalance])).toEqual([
      [groceries, '380.00'],
      [lastGroceries, '315.00'],
    ])

    // Neither must a page that starts after them.
    const page = await agent
      .post('/transactions/search')
      .send({
        sort: [{ field: 'transactionDt', dir: 'asc' }],
        filter: { linkedAccountId: accountId },
        skip: 3,
        limit: 1,
      })
      .expect(201)

    expect(page.body.items.map((row: any) => row.runningBalance)).toEqual([
      '315.00',
    ])
  })

  it('shows each row the running balance of its own account', async () => {
    const first = await createAccount(agent, { balance: '100.00' })
    const second = await createAccount(agent, { balance: '900.00' })
    const a = await add(first, { amount: '10.00' })
    const b = await add(second, { amount: '10.00' })

    const response = await agent
      .post('/transactions/search')
      .send({ filter: { linkedAccountId: undefined }, limit: 100 })
      .expect(201)
    const byId = new Map<number, string>(
      response.body.items.map((row: any) => [row.id, row.runningBalance])
    )

    expect(byId.get(a)).toBe('90.00')
    expect(byId.get(b)).toBe('890.00')
  })

  it('recomputes the balance when the opening balance is edited', async () => {
    const accountId = await createAccount(agent, { balance: '1000.00' })
    await add(accountId, { amount: '100.00' })

    const account = (await agent.get(`/accounts/${accountId}`).expect(200)).body

    expect(account.openingBalance).toBe('1000.00')
    expect(account.balance).toBe('900.00')

    const updated = await agent
      .put('/accounts')
      .send({ ...account, balance: '1500.00' })
      .expect(200)

    expect(updated.body.openingBalance).toBe('1500.00')
    expect(updated.body.balance).toBe('1400.00')
    expect((await rowsOf(accountId))[0].runningBalance).toBe('1400.00')
  })

  it('detects an injected drift in the cached balance', async () => {
    const accountId = await createAccount(agent, { balance: '200.00' })
    await add(accountId, { amount: '50.00' })

    const clean = await agent.get('/balances/consistency').expect(200)

    expect(
      clean.body.drifts.filter((drift: any) => drift.accountId === accountId)
    ).toEqual([])

    await app
      .get<Database>(getDrizzleToken())
      .update(accounts)
      .set({ balance: '999.00' })
      .where(eq(accounts.id, accountId))

    const drifted = await agent.get('/balances/consistency').expect(200)

    expect(
      drifted.body.drifts.filter((drift: any) => drift.accountId === accountId)
    ).toEqual([
      {
        accountId,
        name: expect.any(String),
        balance: '999.00',
        expected: '150.00',
        drift: '849.00',
      },
    ])
  })

  it('answers a daily end-of-day balance history', async () => {
    const accountId = await createAccount(agent, { balance: '100.00' })
    await add(accountId, { amount: '10.00', transactionDt: '2026-10-02' })
    await add(accountId, {
      type: 'Income',
      amount: '5.00',
      transactionDt: '2026-10-04',
    })

    const response = await agent
      .post(`/balances/${accountId}/history`)
      .send({ from: '2026-10-01', to: '2026-10-04' })
      .expect(200)

    expect(response.body.points).toEqual([
      { date: '2026-10-01', balance: '100.00' },
      { date: '2026-10-02', balance: '90.00' },
      { date: '2026-10-03', balance: '90.00' },
      { date: '2026-10-04', balance: '95.00' },
    ])
  })
})

describe('reconciling an account (e2e)', () => {
  let app: INestApplication<App>
  let agent: Agent
  let categoryId: number

  beforeAll(async () => {
    app = await startApp()
    agent = await signUp(app)
    categoryId = await createCategory(agent)
  })

  afterAll(async () => {
    await app.close()
  })

  const add = async (
    accountId: number,
    overrides: Record<string, unknown> = {}
  ): Promise<number> => {
    const response = await agent
      .post('/transactions')
      .send({
        name: 'Entry',
        amount: '100.00',
        transactionDt: '2026-10-10',
        linkedAccountId: accountId,
        categoryId,
        type: 'Expense',
        ...overrides,
      })
      .expect(201)

    return response.body.id
  }

  it('previews the computed balance, the difference, and Verify rows', async () => {
    const accountId = await createAccount(agent, { balance: '1000.00' })
    await add(accountId, { transactionDt: '2026-10-05' })
    await add(accountId, { transactionDt: '2026-10-20' })

    const preview = await agent
      .post(`/reconciliation/${accountId}/preview`)
      .send({ date: '2026-10-10', bankBalance: '890.00' })
      .expect(200)

    expect(preview.body).toMatchObject({
      computedBalance: '900.00',
      difference: '-10.00',
      verifyCount: 1,
    })
    expect(preview.body.verifyRows).toHaveLength(1)
  })

  it('refuses an open difference without an adjustment', async () => {
    const accountId = await createAccount(agent, { balance: '100.00' })

    await agent
      .post(`/reconciliation/${accountId}`)
      .send({ date: '2026-10-10', bankBalance: '90.00' })
      .expect(409)
  })

  it('adjusts the difference, keeps it out of the reports, and locks', async () => {
    const accountId = await createAccount(agent, { balance: '1000.00' })
    const row = await add(accountId, { transactionDt: '2026-10-05' })

    const result = await agent
      .post(`/reconciliation/${accountId}`)
      .send({
        date: '2026-10-10',
        bankBalance: '890.00',
        createAdjustment: true,
        markChecked: true,
      })
      .expect(200)

    expect(result.body).toMatchObject({
      reconciledThrough: '2026-10-10',
      balance: '890.00',
      checkedCount: 1,
    })
    expect(result.body.adjustment).toMatchObject({
      type: 'Expense',
      amount: '10.00',
      isAdjustment: true,
      categoryName: 'Balance adjustment',
      status: 'Checked',
    })

    // The adjustment moved the balance...
    expect(await balanceOf(agent, accountId)).toBe('890.00')

    // ...but neither the summary nor the breakdown counts it.
    const summary = await agent
      .post('/transactions/summary')
      .send({ filter: { linkedAccountId: accountId } })
      .expect(201)
    const breakdown = await agent
      .post('/transactions/breakdown')
      .send({ linkedAccountId: accountId, dimension: 'category' })
      .expect(201)

    expect(summary.body.groups[0]).toMatchObject({
      expenses: '100.00',
      net: '-100.00',
    })
    expect(
      breakdown.body.groups[0].items.map((item: any) => item.name)
    ).not.toContain('Balance adjustment')

    // Rows through the lock date ask for a confirmation.
    const locked = await agent.get(`/transactions/${row}`).expect(200)

    expect(locked.body).toMatchObject({ locked: true, status: 'Checked' })

    await agent
      .patch(`/transactions/${row}/status`)
      .send({ id: row, status: 'Verify' })
      .expect(409)
    await agent.delete(`/transactions/${row}`).expect(409)
    await agent
      .patch(`/transactions/${row}/status`)
      .send({ id: row, status: 'Verify', confirmReconciled: true })
      .expect(200)
    await agent.delete(`/transactions/${row}?confirmReconciled=true`).expect(204)

    // A new row backdated into the reconciled period asks too.
    const backdated = {
      name: 'Late entry',
      amount: '5.00',
      transactionDt: '2026-10-07',
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
    }

    await agent.post('/transactions').send(backdated).expect(409)
    await agent
      .post('/transactions')
      .send({ ...backdated, confirmReconciled: true })
      .expect(201)

    // So does moving an open row into it.
    const open = await add(accountId, { transactionDt: '2026-10-20' })

    await agent
      .put('/transactions')
      .send({ ...backdated, id: open, transactionDt: '2026-10-08' })
      .expect(409)
  })

  it('creates an Income adjustment when the bank holds more', async () => {
    const accountId = await createAccount(agent, { balance: '100.00' })

    const result = await agent
      .post(`/reconciliation/${accountId}`)
      .send({
        date: '2026-10-10',
        bankBalance: '125.50',
        createAdjustment: true,
      })
      .expect(200)

    expect(result.body.adjustment).toMatchObject({
      type: 'Income',
      amount: '25.50',
    })
    expect(await balanceOf(agent, accountId)).toBe('125.50')
  })
})
