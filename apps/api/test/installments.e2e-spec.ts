import {
  addDays,
  resolveStatement,
  todayIn,
  type InstallmentGroup,
  type Transaction,
} from '@workspace/poco'
import { describe, expect, it } from 'vitest'

import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

const cycle = { closeDay: 25, dueDay: 5, closeDayInclusive: false }

describe('installment purchases (e2e, #6)', () => {
  const { app } = startApp()

  /** A signed-in agent with one category, the tenant's today, and its
   * main currency — per test (the storage isolates per test). */
  async function session(): Promise<{
    agent: Agent
    categoryId: number
    today: string
    currency: string
  }> {
    const agent = await signUp(app)
    const categoryId = await createCategory(agent)
    const settings = await agent.get('/api/settings')
    expect(settings.status).toBe(200)

    return {
      agent,
      categoryId,
      today: todayIn(settings.body.timezone),
      currency: settings.body.mainCurrency,
    }
  }

  /** Creates a credit card in the main currency. */
  function createCard(
    agent: Agent,
    currency: string,
    days: { closeDay: number; dueDay: number } = cycle
  ) {
    return createAccount(agent, {
      type: 'Credit Card',
      agency: null,
      number: null,
      balance: '0.00',
      limit: '5000.00',
      currency,
      ...days,
    })
  }

  /** Buys on a card in installments; answers installment 1. */
  async function buy(
    agent: Agent,
    categoryId: number,
    card: number,
    transactionDt: string,
    amount: string,
    count: number,
    amountMode: 'total' | 'perInstallment' = 'total'
  ): Promise<Transaction> {
    const response = await agent.post('/api/transactions', {
      name: 'TV',
      amount,
      transactionDt,
      linkedAccountId: card,
      categoryId,
      type: 'Expense',
      installments: { count, amountMode },
    })
    expect(response.status).toBe(201)

    return response.body
  }

  async function group(
    agent: Agent,
    id: string
  ): Promise<InstallmentGroup> {
    const response = await agent.get(`/api/transactions/installments/${id}`)
    expect(response.status).toBe(200)

    return response.body
  }

  it('splits a purchase across consecutive bills, the remainder on installment 1', async () => {
    const { agent, categoryId, today, currency } = await session()
    const card = await createCard(agent, currency)
    const first = await buy(agent, categoryId, card, today, '1000.00', 3)
    const purchase = await group(
      agent,
      first.installmentGroupId as string
    )

    expect(purchase.total).toBe('1000.00')
    expect(purchase.editable).toBe(true)
    expect(purchase.installments.map((row) => row.amount)).toEqual([
      '333.34',
      '333.33',
      '333.33',
    ])
    expect(purchase.installments.map((row) => row.installmentNumber)).toEqual([
      1, 2, 3,
    ])
    expect(
      purchase.installments.every(
        (row) =>
          row.transactionDt === today &&
          row.statementPinned &&
          row.installmentCount === 3
      )
    ).toBe(true)
    expect(purchase.installments.map((row) => row.statementDueDate)).toEqual(
      [0, 1, 2].map((offset) => resolveStatement(cycle, today, offset).dueDate)
    )
    // The whole purchase hits the card at once.
    expect(await balanceOf(agent, card)).toBe('-1000.00')
  })

  it('offsets bills instead of shifting days: close 30, Jan 29, 3×', async () => {
    const { agent, categoryId, currency } = await session()
    const card = await createCard(agent, currency, {
      closeDay: 30,
      dueDay: 10,
    })
    const first = await buy(agent, categoryId, card, '2027-01-29', '300.00', 3)
    const purchase = await group(agent, first.installmentGroupId as string)
    const closes = await Promise.all(
      purchase.installments.map(async (row) => {
        const bill = await agent.get(`/api/credit-card-statements/${row.statementId}`)
        expect(bill.status).toBe(200)

        return bill.body.closeDate
      })
    )

    expect(closes).toEqual(['2027-01-30', '2027-02-28', '2027-03-30'])
  })

  it('repeats a per-installment amount', async () => {
    const { agent, categoryId, today, currency } = await session()
    const card = await createCard(agent, currency)
    const first = await buy(
      agent,
      categoryId,
      card,
      today,
      '110.00',
      3,
      'perInstallment'
    )

    expect(
      (await group(agent, first.installmentGroupId as string)).total
    ).toBe('330.00')
  })

  it('answers 409 for installments off a credit card', async () => {
    const { agent, categoryId, today, currency } = await session()
    const checking = await createAccount(agent, { currency })

    const response = await agent.post('/api/transactions', {
      name: 'TV',
      amount: '300.00',
      transactionDt: today,
      linkedAccountId: checking,
      categoryId,
      type: 'Expense',
      installments: { count: 3 },
    })

    expect(response.status).toBe(409)
  })

  it('re-splits an Open purchase as a whole, in place or recreated', async () => {
    const { agent, categoryId, today, currency } = await session()
    const card = await createCard(agent, currency)
    const first = await buy(agent, categoryId, card, today, '300.00', 3)
    const id = first.installmentGroupId as string
    const edit = (amount: string, count: number) =>
      agent.put(`/api/transactions/installments/${id}`, {
        name: 'Big TV',
        categoryId,
        amount,
        installments: { count, amountMode: 'total' },
      })

    const inPlace = await edit('600.00', 3)
    expect(inPlace.status).toBe(200)
    expect(inPlace.body.installments.map((row: Transaction) => row.id)).toEqual(
      (await group(agent, id)).installments.map((row) => row.id)
    )
    expect(inPlace.body.total).toBe('600.00')
    expect(await balanceOf(agent, card)).toBe('-600.00')

    const history = await agent.get(`/api/transactions/${first.id}/history`)
    expect(history.status).toBe(200)
    expect(history.body[0].action).toBe('UPDATE')

    const recreated = await edit('600.00', 4)
    expect(recreated.status).toBe(200)
    expect(recreated.body.installments).toHaveLength(4)
    expect(recreated.body.installments[0].name).toBe('Big TV')
    expect(await balanceOf(agent, card)).toBe('-600.00')
  })

  it('keeps billed installments as history: shared fields change, money answers 409', async () => {
    const { agent, categoryId, currency } = await session()
    const otherCategory = await createCategory(agent)
    const card = await createCard(agent, currency)
    const settings = await agent.get('/api/settings')
    expect(settings.status).toBe(200)
    const today = todayIn(settings.body.timezone)
    const first = await buy(
      agent,
      categoryId,
      card,
      addDays(today, -60),
      '400.00',
      4
    )
    const id = first.installmentGroupId as string

    expect((await group(agent, id)).editable).toBe(false)

    const renamed = await agent.put(`/api/transactions/installments/${id}`, {
      name: 'Renamed',
      categoryId: otherCategory,
      amount: '400.00',
      installments: { count: 4, amountMode: 'total' },
    })
    expect(renamed.status).toBe(200)

    const renamedGroup = renamed.body as InstallmentGroup
    expect(
      renamedGroup.installments.every(
        (row) => row.name === 'Renamed' && row.categoryId === otherCategory
      )
    ).toBe(true)

    let response = await agent.put(`/api/transactions/installments/${id}`, {
      name: 'Renamed',
      categoryId,
      amount: '800.00',
      installments: { count: 4, amountMode: 'total' },
    })
    expect(response.status).toBe(409)
    response = await agent.delete(`/api/transactions/installments/${id}?scope=all`)
    expect(response.status).toBe(409)
  })

  it('deletes the remaining installments, leaving the billed ones', async () => {
    const { agent, categoryId, currency } = await session()
    const card = await createCard(agent, currency)
    const settings = await agent.get('/api/settings')
    expect(settings.status).toBe(200)
    const today = todayIn(settings.body.timezone)
    const first = await buy(
      agent,
      categoryId,
      card,
      addDays(today, -60),
      '400.00',
      4
    )
    const id = first.installmentGroupId as string
    const before = await group(agent, id)
    const bills = await Promise.all(
      before.installments.map(async (row) => {
        const bill = await agent.get(
          `/api/credit-card-statements/${row.statementId}`
        )
        expect(bill.status).toBe(200)

        return bill.body
      })
    )
    const billed = bills.filter((bill) => bill.status !== 'Open')

    const deleted = await agent.delete(
      `/api/transactions/installments/${id}?scope=remaining`
    )
    expect(deleted.status).toBe(204)

    const after = await group(agent, id)

    expect(billed.length).toBeGreaterThan(0)
    expect(after.installments).toHaveLength(billed.length)
    expect(after.installments.map((row) => row.statementId)).toEqual(
      billed.map((bill) => bill.id)
    )
    expect(await balanceOf(agent, card)).toBe(`-${after.total}`)
  })

  it('deletes a whole Open purchase, restoring the balance', async () => {
    const { agent, categoryId, today, currency } = await session()
    const card = await createCard(agent, currency)
    const first = await buy(agent, categoryId, card, today, '300.00', 3)
    const id = first.installmentGroupId as string

    const deleted = await agent.delete(`/api/transactions/installments/${id}`)
    expect(deleted.status).toBe(204)

    expect(await balanceOf(agent, card)).toBe('0.00')
    const missing = await agent.get(`/api/transactions/installments/${id}`)
    expect(missing.status).toBe(404)
  })

  it('refunds a purchase in full: the rest deleted, the billed part credited', async () => {
    const { agent, categoryId, currency } = await session()
    const card = await createCard(agent, currency)
    const settings = await agent.get('/api/settings')
    expect(settings.status).toBe(200)
    const today = todayIn(settings.body.timezone)
    const first = await buy(
      agent,
      categoryId,
      card,
      addDays(today, -60),
      '400.00',
      4
    )
    const id = first.installmentGroupId as string

    await agent.delete(`/api/transactions/installments/${id}?scope=remaining`)
    const billed = await group(agent, id)
    const refunded = await agent.post(
      `/api/transactions/installments/${id}/refund`,
      { name: 'Refund: TV' }
    )
    expect(refunded.status).toBe(201)

    expect(refunded.body.refund.type).toBe('Income')
    expect(refunded.body.refund.amount).toBe(billed.total)
    expect(await balanceOf(agent, card)).toBe('0.00')
  })

  it('edits one Open installment alone, but never its name', async () => {
    const { agent, categoryId, today, currency } = await session()
    const card = await createCard(agent, currency)
    const first = await buy(agent, categoryId, card, today, '300.00', 3)
    const body = {
      id: first.id,
      name: first.name,
      amount: '120.00',
      transactionDt: first.transactionDt,
      linkedAccountId: card,
      categoryId,
      type: 'Expense',
      status: 'Verify',
    }

    const edited = await agent.put('/api/transactions', body)
    expect(edited.status).toBe(200)
    expect(await balanceOf(agent, card)).toBe('-320.00')

    let response = await agent.put('/api/transactions', {
      ...body,
      name: 'Other',
    })
    expect(response.status).toBe(409)
    response = await agent.delete(`/api/transactions/${first.id}`)
    expect(response.status).toBe(409)
  })

  it('converts a single expense into installments and back', async () => {
    const { agent, categoryId, today, currency } = await session()
    const card = await createCard(agent, currency)
    const single = await agent.post('/api/transactions', {
      name: 'Sofa',
      amount: '900.00',
      transactionDt: today,
      linkedAccountId: card,
      categoryId,
      type: 'Expense',
    })
    expect(single.status).toBe(201)

    const split = await agent.post(
      `/api/transactions/${single.body.id}/installments`,
      { count: 3, amountMode: 'total' }
    )
    expect(split.status).toBe(201)
    const splitGroup = split.body as InstallmentGroup

    expect(splitGroup.installments.map((row) => row.amount)).toEqual([
      '300.00',
      '300.00',
      '300.00',
    ])
    const read = await agent.get(`/api/transactions/${single.body.id}`)
    expect(read.status).toBe(200)
    expect(read.body.lifecycle).toBe('DELETED')

    const collapsed = await agent.post(
      `/api/transactions/installments/${splitGroup.groupId}/collapse`
    )
    expect(collapsed.status).toBe(201)

    expect(collapsed.body.amount).toBe('900.00')
    expect(collapsed.body.installmentGroupId).toBeNull()
    expect(collapsed.body.statementId).toBe(
      splitGroup.installments[0].statementId
    )
    expect(await balanceOf(agent, card)).toBe('-900.00')
  })

  it('counts the full purchase against a limit in the purchase period', async () => {
    const own = await signUp(app)
    const settings = await own.get('/api/settings')
    expect(settings.status).toBe(200)
    const category = await createCategory(own)
    const card = await createAccount(own, {
      type: 'Credit Card',
      agency: null,
      number: null,
      balance: '0.00',
      limit: '5000.00',
      currency: settings.body.mainCurrency,
      ...cycle,
    })

    const limit = await own.post('/api/limits', {
      categoryId: category,
      amount: '5000.00',
      type: 'Yearly',
    })
    expect(limit.status).toBe(201)
    const purchase = await own.post('/api/transactions', {
      name: 'TV',
      amount: '1200.00',
      transactionDt: todayIn(settings.body.timezone),
      linkedAccountId: card,
      categoryId: category,
      type: 'Expense',
      installments: { count: 10 },
    })
    expect(purchase.status).toBe(201)

    const usage = await own.get('/api/limits/usage')
    expect(usage.status).toBe(200)

    expect(usage.body[0].spent).toBe('1200.00')
  })
})
