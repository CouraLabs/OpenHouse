import { eq } from 'drizzle-orm'
import { env } from 'cloudflare:workers'
import { accounts, createDatabase, type Database } from '@workspace/db'
import { describe, expect, it } from 'vitest'

import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

describe('the chronological running balance (e2e)', () => {
  const { app } = startApp()

  /** A signed-in agent with two categories, per test (the storage isolates
   * per test). */
  async function session(): Promise<{
    agent: Agent
    categoryId: number
    otherCategoryId: number
  }> {
    const agent = await signUp(app)
    const categoryId = await createCategory(agent)
    const otherCategoryId = await createCategory(agent)

    return { agent, categoryId, otherCategoryId }
  }

  /** Creates a transaction on an account and answers its id. */
  const add = async (
    agent: Agent,
    categoryId: number,
    accountId: number,
    overrides: Record<string, unknown> = {}
  ): Promise<number> => {
    const response = await agent.post('/api/transactions', {
      name: 'Entry',
      amount: '100.00',
      transactionDt: '2026-10-10',
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
      ...overrides,
    })
    expect(response.status).toBe(201)

    return response.body.id
  }

  /** The account's rows in date order with their running balances. */
  const rowsOf = async (
    agent: Agent,
    accountId: number,
    filter: Record<string, unknown> = {}
  ) => {
    const response = await agent.post('/api/transactions/search', {
      sort: [{ field: 'transactionDt', dir: 'asc' }],
      filter: { linkedAccountId: accountId, ...filter },
      limit: 100,
    })
    expect(response.status).toBe(201)

    return response.body.items as Array<{
      id: number
      runningBalance: string
    }>
  }

  it('shows a backdated expense at its place in date order', async () => {
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '1000.00' })
    const oct10 = await add(agent, categoryId, accountId, {
      transactionDt: '2026-10-10',
    })
    const oct5 = await add(agent, categoryId, accountId, {
      transactionDt: '2026-10-05',
      amount: '50.00',
    })

    const rows = await rowsOf(agent, accountId)

    // Entered second, dated first: 1000 - 50 = 950, then 950 - 100 = 850.
    expect(rows.map((row) => [row.id, row.runningBalance])).toEqual([
      [oct5, '950.00'],
      [oct10, '850.00'],
    ])
    expect(await balanceOf(agent, accountId)).toBe('850.00')
  })

  it('counts Income, and skips Canceled and deleted rows', async () => {
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '100.00' })
    const income = await add(agent, categoryId, accountId, {
      type: 'Income',
      amount: '40.00',
      transactionDt: '2026-10-01',
    })
    const canceled = await add(agent, categoryId, accountId, {
      amount: '30.00',
      transactionDt: '2026-10-02',
      status: 'Canceled',
    })
    const kept = await add(agent, categoryId, accountId, {
      amount: '10.00',
      transactionDt: '2026-10-03',
    })

    const rows = await rowsOf(agent, accountId)

    expect(rows.map((row) => [row.id, row.runningBalance])).toEqual([
      [income, '140.00'],
      [canceled, '140.00'],
      [kept, '130.00'],
    ])

    const deleted = await agent.delete(`/api/transactions/${kept}`)
    expect(deleted.status).toBe(204)

    expect((await rowsOf(agent, accountId)).map((row) => row.runningBalance))
      .toEqual(['140.00', '140.00'])
  })

  it('computes the window before the filters and the paging', async () => {
    const { agent, categoryId, otherCategoryId } = await session()
    const accountId = await createAccount(agent, { balance: '500.00' })
    await add(agent, categoryId, accountId, {
      amount: '100.00',
      transactionDt: '2026-10-01',
      categoryId: otherCategoryId,
    })
    const groceries = await add(agent, categoryId, accountId, {
      amount: '20.00',
      transactionDt: '2026-10-02',
    })
    await add(agent, categoryId, accountId, {
      amount: '60.00',
      transactionDt: '2026-10-03',
      categoryId: otherCategoryId,
    })
    const lastGroceries = await add(agent, categoryId, accountId, {
      amount: '5.00',
      transactionDt: '2026-10-04',
    })

    // Filtering to one category must not skip the other rows' deltas.
    const filtered = await rowsOf(agent, accountId, { categoryId })

    expect(filtered.map((row) => [row.id, row.runningBalance])).toEqual([
      [groceries, '380.00'],
      [lastGroceries, '315.00'],
    ])

    // Neither must a page that starts after them.
    const page = await agent.post('/api/transactions/search', {
      sort: [{ field: 'transactionDt', dir: 'asc' }],
      filter: { linkedAccountId: accountId },
      skip: 3,
      limit: 1,
    })
    expect(page.status).toBe(201)

    expect(
      (page.body.items as Array<{ runningBalance: string }>).map(
        (row) => row.runningBalance
      )
    ).toEqual(['315.00'])
  })

  it('shows each row the running balance of its own account', async () => {
    const { agent, categoryId } = await session()
    const first = await createAccount(agent, { balance: '100.00' })
    const second = await createAccount(agent, { balance: '900.00' })
    const a = await add(agent, categoryId, first, { amount: '10.00' })
    const b = await add(agent, categoryId, second, { amount: '10.00' })

    const response = await agent.post('/api/transactions/search', {
      filter: { linkedAccountId: undefined },
      limit: 100,
    })
    expect(response.status).toBe(201)

    const byId = new Map<number, string>(
      (response.body.items as Array<{ id: number; runningBalance: string }>)
        .map((row) => [row.id, row.runningBalance])
    )

    expect(byId.get(a)).toBe('90.00')
    expect(byId.get(b)).toBe('890.00')
  })

  it('recomputes the balance when the opening balance is edited', async () => {
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '1000.00' })
    await add(agent, categoryId, accountId, { amount: '100.00' })

    const read = await agent.get(`/api/accounts/${accountId}`)
    expect(read.status).toBe(200)
    const account = read.body

    expect(account.openingBalance).toBe('1000.00')
    expect(account.balance).toBe('900.00')

    const updated = await agent.put('/api/accounts', {
      ...account,
      balance: '1500.00',
    })
    expect(updated.status).toBe(200)

    expect(updated.body.openingBalance).toBe('1500.00')
    expect(updated.body.balance).toBe('1400.00')
    expect((await rowsOf(agent, accountId))[0].runningBalance).toBe('1400.00')
  })

  it('detects an injected drift in the cached balance', async () => {
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '200.00' })
    await add(agent, categoryId, accountId, { amount: '50.00' })

    const clean = await agent.get('/api/balances/consistency')
    expect(clean.status).toBe(200)

    expect(
      clean.body.drifts.filter(
        (drift: { accountId: number }) => drift.accountId === accountId
      )
    ).toEqual([])

    // The old spec reached through the Nest app; here the same Drizzle
    // handle builds straight from the isolate's D1 binding.
    const db: Database = createDatabase(env.DB as never)
    await db
      .update(accounts)
      .set({ balance: '999.00' })
      .where(eq(accounts.id, accountId))

    const drifted = await agent.get('/api/balances/consistency')
    expect(drifted.status).toBe(200)

    expect(
      drifted.body.drifts.filter(
        (drift: { accountId: number }) => drift.accountId === accountId
      )
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
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '100.00' })
    await add(agent, categoryId, accountId, {
      amount: '10.00',
      transactionDt: '2026-10-02',
    })
    await add(agent, categoryId, accountId, {
      type: 'Income',
      amount: '5.00',
      transactionDt: '2026-10-04',
    })

    const response = await agent.post(`/api/balances/${accountId}/history`, {
      from: '2026-10-01',
      to: '2026-10-04',
    })
    expect(response.status).toBe(200)

    expect(response.body.points).toEqual([
      { date: '2026-10-01', balance: '100.00' },
      { date: '2026-10-02', balance: '90.00' },
      { date: '2026-10-03', balance: '90.00' },
      { date: '2026-10-04', balance: '95.00' },
    ])
  })
})

describe('reconciling an account (e2e)', () => {
  const { app } = startApp()

  async function session(): Promise<{ agent: Agent; categoryId: number }> {
    const agent = await signUp(app)
    const categoryId = await createCategory(agent)

    return { agent, categoryId }
  }

  const add = async (
    agent: Agent,
    categoryId: number,
    accountId: number,
    overrides: Record<string, unknown> = {}
  ): Promise<number> => {
    const response = await agent.post('/api/transactions', {
      name: 'Entry',
      amount: '100.00',
      transactionDt: '2026-10-10',
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
      ...overrides,
    })
    expect(response.status).toBe(201)

    return response.body.id
  }

  it('previews the computed balance, the difference, and Verify rows', async () => {
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '1000.00' })
    await add(agent, categoryId, accountId, { transactionDt: '2026-10-05' })
    await add(agent, categoryId, accountId, { transactionDt: '2026-10-20' })

    const preview = await agent.post(`/api/reconciliation/${accountId}/preview`, {
      date: '2026-10-10',
      bankBalance: '890.00',
    })
    expect(preview.status).toBe(200)

    expect(preview.body).toMatchObject({
      computedBalance: '900.00',
      difference: '-10.00',
      verifyCount: 1,
    })
    expect(preview.body.verifyRows).toHaveLength(1)
  })

  it('refuses an open difference without an adjustment', async () => {
    const { agent } = await session()
    const accountId = await createAccount(agent, { balance: '100.00' })

    const response = await agent.post(`/api/reconciliation/${accountId}`, {
      date: '2026-10-10',
      bankBalance: '90.00',
    })

    expect(response.status).toBe(409)
  })

  it('adjusts the difference, keeps it out of the reports, and locks', async () => {
    const { agent, categoryId } = await session()
    const accountId = await createAccount(agent, { balance: '1000.00' })
    const row = await add(agent, categoryId, accountId, {
      transactionDt: '2026-10-05',
    })

    const result = await agent.post(`/api/reconciliation/${accountId}`, {
      date: '2026-10-10',
      bankBalance: '890.00',
      createAdjustment: true,
      markChecked: true,
    })
    expect(result.status).toBe(200)

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
    const summary = await agent.post('/api/transactions/summary', {
      filter: { linkedAccountId: accountId },
    })
    expect(summary.status).toBe(201)
    const breakdown = await agent.post('/api/transactions/breakdown', {
      linkedAccountId: accountId,
      dimension: 'category',
    })
    expect(breakdown.status).toBe(201)

    expect(summary.body.groups[0]).toMatchObject({
      expenses: '100.00',
      net: '-100.00',
    })
    expect(
      breakdown.body.groups[0].items.map(
        (item: { name: string }) => item.name
      )
    ).not.toContain('Balance adjustment')

    // Rows through the lock date ask for a confirmation.
    const locked = await agent.get(`/api/transactions/${row}`)
    expect(locked.status).toBe(200)

    expect(locked.body).toMatchObject({ locked: true, status: 'Checked' })

    let response = await agent.patch(`/api/transactions/${row}/status`, {
      id: row,
      status: 'Verify',
    })
    expect(response.status).toBe(409)
    response = await agent.delete(`/api/transactions/${row}`)
    expect(response.status).toBe(409)
    response = await agent.patch(`/api/transactions/${row}/status`, {
      id: row,
      status: 'Verify',
      confirmReconciled: true,
    })
    expect(response.status).toBe(200)
    response = await agent.delete(
      `/api/transactions/${row}?confirmReconciled=true`
    )
    expect(response.status).toBe(204)

    // A new row backdated into the reconciled period asks too.
    const backdated = {
      name: 'Late entry',
      amount: '5.00',
      transactionDt: '2026-10-07',
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
    }

    response = await agent.post('/api/transactions', backdated)
    expect(response.status).toBe(409)
    response = await agent.post('/api/transactions', {
      ...backdated,
      confirmReconciled: true,
    })
    expect(response.status).toBe(201)

    // So does moving an open row into it.
    const open = await add(agent, categoryId, accountId, {
      transactionDt: '2026-10-20',
    })

    response = await agent.put('/api/transactions', {
      ...backdated,
      id: open,
      transactionDt: '2026-10-08',
    })
    expect(response.status).toBe(409)
  })

  it('creates an Income adjustment when the bank holds more', async () => {
    const { agent } = await session()
    const accountId = await createAccount(agent, { balance: '100.00' })

    const result = await agent.post(`/api/reconciliation/${accountId}`, {
      date: '2026-10-10',
      bankBalance: '125.50',
      createAdjustment: true,
    })
    expect(result.status).toBe(200)

    expect(result.body.adjustment).toMatchObject({
      type: 'Income',
      amount: '25.50',
    })
    expect(await balanceOf(agent, accountId)).toBe('125.50')
  })
})
