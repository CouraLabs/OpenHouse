import {
  todayIn,
  type HouseholdMember,
  type HouseholdOverview,
  type Transaction,
} from '@workspace/poco'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  joinAsMember,
  signUp,
  startApp,
} from './support.js'

describe('household splitting and settle-up (e2e, #14)', () => {
  let owner: Agent
  let member: { agent: Agent; id: number }
  let ownerId: number
  let categoryId: number
  let accountId: number
  let memberAccountId: number
  let today: string
  let currency: string

  beforeAll(async () => {
    const { app } = startApp()
    owner = await signUp(app)
    member = await joinAsMember(app, owner)
    categoryId = await createCategory(owner)

    const members = await owner.get('/api/household/members')

    expect(members.status).toBe(200)
    const owned = (members.body as HouseholdMember[]).find(
      (candidate) => candidate.id !== member.id
    )
    expect(owned).toBeDefined()
    ownerId = owned?.id ?? 0

    const settings = await owner.get('/api/settings')

    expect(settings.status).toBe(200)
    today = todayIn(settings.body.timezone)
    currency = settings.body.mainCurrency
    accountId = await createAccount(owner, { currency })
    memberAccountId = await createAccount(owner, { currency })
  })

  afterAll(() => {
    // The storage is per-test isolated; nothing to close.
  })

  const overview = async (): Promise<HouseholdOverview> => {
    const response = await owner.post('/api/household/overview', {})

    expect(response.status).toBe(200)

    return response.body
  }

  const spend = async (body: Record<string, unknown>): Promise<Transaction> => {
    const response = await owner.post('/api/transactions', {
      name: 'Dinner',
      amount: '100.00',
      transactionDt: today,
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
      ...body,
    })

    expect(response.status).toBe(201)

    return response.body
  }

  it('splits an expense, shows the balance, and settles it to zero', async () => {
    const created = await spend({
      split: {
        mode: 'equal',
        entries: [{ userId: ownerId }, { userId: member.id }],
      },
    })

    expect(created.paidByUserId).toBe(ownerId)
    expect(created.splits.map((entry) => entry.share)).toEqual(['50.00', '50.00'])

    const before = await overview()

    expect(before.suggestions).toEqual([
      expect.objectContaining({
        fromUserId: member.id,
        toUserId: ownerId,
        amount: '50.00',
      }),
    ])

    const settled = await member.agent.post('/api/transactions/settle', {
      fromUserId: member.id,
      toUserId: ownerId,
      amount: '50.00',
      currency,
      fromAccountId: memberAccountId,
      toAccountId: accountId,
      transactionDt: today,
    })

    expect(settled.status).toBe(201)
    expect(settled.body).toHaveLength(2)
    expect(settled.body[0].isSettlement).toBe(true)

    const after = await overview()

    expect(after.suggestions).toEqual([])
    expect(after.settlements).toHaveLength(1)
    // The settlement is no income or expense.
    const summary = await owner.post('/api/transactions/summary', {})

    expect(summary.status).toBe(201)
    expect(JSON.stringify(summary.body)).not.toContain('50.00,')
    expect(await balanceOf(owner, memberAccountId)).toBe('950.00')
  })

  it('rejects a split that does not add up and a split transfer', async () => {
    const bad = await owner.post('/api/transactions', {
      name: 'Bad',
      amount: '10.00',
      transactionDt: today,
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
      split: {
        mode: 'exact',
        entries: [
          { userId: ownerId, value: '1.00' },
          { userId: member.id, value: '1.00' },
        ],
      },
    })

    expect(bad.status).toBe(400)

    const splitTransfer = await owner.post('/api/transactions/transfer', {
      fromAccountId: accountId,
      toAccountId: memberAccountId,
      categoryId,
      amount: '5.00',
      transactionDt: today,
      split: { mode: 'equal', entries: [{ userId: ownerId }] },
    })

    expect(splitTransfer.status).toBe(400)
  })

  it('creates no debts on a shared account', async () => {
    const shared = await createAccount(owner, {
      currency,
      ownership: 'shared',
    })
    const base = await overview()

    const refused = await owner.post('/api/transactions', {
      name: 'Joint',
      amount: '40.00',
      transactionDt: today,
      linkedAccountId: shared,
      categoryId,
      type: 'Expense',
      split: { mode: 'equal', entries: [{ userId: member.id }] },
    })

    expect(refused.status).toBe(409)

    const after = await overview()

    expect(after.balances).toEqual(base.balances)
  })

  it('warns about a member balance and keeps it after removal', async () => {
    await spend({
      amount: '30.00',
      split: { mode: 'equal', entries: [{ userId: member.id }] },
    })

    const check = await owner.get(`/api/household/members/${member.id}/balance`)

    expect(check.status).toBe(200)
    expect(check.body.lines).toEqual([{ currency, balance: '-30.00' }])

    const removed = await owner.post(`/api/tenants/users/${member.id}/deactivate`)

    expect(removed.status).toBe(200)

    const after = await overview()

    expect(
      after.balances.find((entry) => entry.userId === member.id)
    ).toEqual(expect.objectContaining({ isActive: false, balance: '-30.00' }))

    // A removed member can still be settled.
    const settled = await owner.post('/api/transactions/settle', {
      fromUserId: member.id,
      toUserId: ownerId,
      amount: '30.00',
      currency,
      fromAccountId: memberAccountId,
      transactionDt: today,
    })

    expect(settled.status).toBe(201)
  })
})
