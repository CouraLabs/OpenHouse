import type { INestApplication } from '@nestjs/common'
import {
  addDays,
  resolveStatement,
  todayIn,
  type InstallmentGroup,
  type Transaction,
} from '@workspace/poco'
import type { App } from 'supertest/types.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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
  let app: INestApplication<App>
  let agent: Agent
  let categoryId: number
  let today: string
  let currency: string

  beforeAll(async () => {
    app = await startApp()
    agent = await signUp(app)
    categoryId = await createCategory(agent)

    const settings = await agent.get('/settings').expect(200)
    today = todayIn(settings.body.timezone)
    currency = settings.body.mainCurrency
  })

  afterAll(async () => {
    await app.close()
  })

  /** Creates a credit card in the main currency. */
  function createCard(days: { closeDay: number; dueDay: number } = cycle) {
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
    card: number,
    transactionDt: string,
    amount: string,
    count: number,
    amountMode: 'total' | 'perInstallment' = 'total'
  ): Promise<Transaction> {
    const response = await agent
      .post('/transactions')
      .send({
        name: 'TV',
        amount,
        transactionDt,
        linkedAccountId: card,
        categoryId,
        type: 'Expense',
        installments: { count, amountMode },
      })
      .expect(201)

    return response.body
  }

  async function group(id: string): Promise<InstallmentGroup> {
    return (await agent.get(`/transactions/installments/${id}`).expect(200))
      .body
  }

  it('splits a purchase across consecutive bills, the remainder on installment 1', async () => {
    const card = await createCard()
    const first = await buy(card, today, '1000.00', 3)
    const purchase = await group(first.installmentGroupId as string)

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
    const card = await createCard({ closeDay: 30, dueDay: 10 })
    const first = await buy(card, '2027-01-29', '300.00', 3)
    const purchase = await group(first.installmentGroupId as string)
    const closes = await Promise.all(
      purchase.installments.map(
        async (row) =>
          (
            await agent
              .get(`/credit-card-statements/${row.statementId}`)
              .expect(200)
          ).body.closeDate
      )
    )

    expect(closes).toEqual(['2027-01-30', '2027-02-28', '2027-03-30'])
  })

  it('repeats a per-installment amount', async () => {
    const card = await createCard()
    const first = await buy(card, today, '110.00', 3, 'perInstallment')

    expect((await group(first.installmentGroupId as string)).total).toBe(
      '330.00'
    )
  })

  it('answers 409 for installments off a credit card', async () => {
    const checking = await createAccount(agent, { currency })

    await agent
      .post('/transactions')
      .send({
        name: 'TV',
        amount: '300.00',
        transactionDt: today,
        linkedAccountId: checking,
        categoryId,
        type: 'Expense',
        installments: { count: 3 },
      })
      .expect(409)
  })

  it('re-splits an Open purchase as a whole, in place or recreated', async () => {
    const card = await createCard()
    const first = await buy(card, today, '300.00', 3)
    const id = first.installmentGroupId as string
    const edit = (amount: string, count: number) =>
      agent.put(`/transactions/installments/${id}`).send({
        name: 'Big TV',
        categoryId,
        amount,
        installments: { count, amountMode: 'total' },
      })

    const inPlace = (await edit('600.00', 3).expect(200)).body
    expect(inPlace.installments.map((row: Transaction) => row.id)).toEqual(
      (await group(id)).installments.map((row) => row.id)
    )
    expect(inPlace.total).toBe('600.00')
    expect(await balanceOf(agent, card)).toBe('-600.00')

    const history = (
      await agent.get(`/transactions/${first.id}/history`).expect(200)
    ).body
    expect(history[0].action).toBe('UPDATE')

    const recreated = (await edit('600.00', 4).expect(200)).body
    expect(recreated.installments).toHaveLength(4)
    expect(recreated.installments[0].name).toBe('Big TV')
    expect(await balanceOf(agent, card)).toBe('-600.00')
  })

  it('keeps billed installments as history: shared fields change, money answers 409', async () => {
    const card = await createCard()
    const otherCategory = await createCategory(agent)
    const first = await buy(card, addDays(today, -60), '400.00', 4)
    const id = first.installmentGroupId as string

    expect((await group(id)).editable).toBe(false)

    const renamed = (
      await agent
        .put(`/transactions/installments/${id}`)
        .send({
          name: 'Renamed',
          categoryId: otherCategory,
          amount: '400.00',
          installments: { count: 4, amountMode: 'total' },
        })
        .expect(200)
    ).body as InstallmentGroup

    expect(
      renamed.installments.every(
        (row) => row.name === 'Renamed' && row.categoryId === otherCategory
      )
    ).toBe(true)

    await agent
      .put(`/transactions/installments/${id}`)
      .send({
        name: 'Renamed',
        categoryId,
        amount: '800.00',
        installments: { count: 4, amountMode: 'total' },
      })
      .expect(409)
    await agent
      .delete(`/transactions/installments/${id}?scope=all`)
      .expect(409)
  })

  it('deletes the remaining installments, leaving the billed ones', async () => {
    const card = await createCard()
    const first = await buy(card, addDays(today, -60), '400.00', 4)
    const id = first.installmentGroupId as string
    const before = await group(id)
    const billed = (
      await Promise.all(
        before.installments.map(
          async (row) =>
            (
              await agent
                .get(`/credit-card-statements/${row.statementId}`)
                .expect(200)
            ).body
        )
      )
    ).filter((bill) => bill.status !== 'Open')

    await agent
      .delete(`/transactions/installments/${id}?scope=remaining`)
      .expect(204)

    const after = await group(id)

    expect(billed.length).toBeGreaterThan(0)
    expect(after.installments).toHaveLength(billed.length)
    expect(after.installments.map((row) => row.statementId)).toEqual(
      billed.map((bill) => bill.id)
    )
    expect(await balanceOf(agent, card)).toBe(`-${after.total}`)
  })

  it('deletes a whole Open purchase, restoring the balance', async () => {
    const card = await createCard()
    const first = await buy(card, today, '300.00', 3)

    await agent
      .delete(`/transactions/installments/${first.installmentGroupId}`)
      .expect(204)

    expect(await balanceOf(agent, card)).toBe('0.00')
    await agent
      .get(`/transactions/installments/${first.installmentGroupId}`)
      .expect(404)
  })

  it('refunds a purchase in full: the rest deleted, the billed part credited', async () => {
    const card = await createCard()
    const first = await buy(card, addDays(today, -60), '400.00', 4)
    const id = first.installmentGroupId as string

    await agent.delete(`/transactions/installments/${id}?scope=remaining`)
    const billed = await group(id)
    const refunded = (
      await agent
        .post(`/transactions/installments/${id}/refund`)
        .send({ name: 'Refund: TV' })
        .expect(201)
    ).body

    expect(refunded.refund.type).toBe('Income')
    expect(refunded.refund.amount).toBe(billed.total)
    expect(await balanceOf(agent, card)).toBe('0.00')
  })

  it('edits one Open installment alone, but never its name', async () => {
    const card = await createCard()
    const first = await buy(card, today, '300.00', 3)
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

    await agent.put('/transactions').send(body).expect(200)
    expect(await balanceOf(agent, card)).toBe('-320.00')

    await agent
      .put('/transactions')
      .send({ ...body, name: 'Other' })
      .expect(409)
    await agent.delete(`/transactions/${first.id}`).expect(409)
  })

  it('converts a single expense into installments and back', async () => {
    const card = await createCard()
    const single = (
      await agent
        .post('/transactions')
        .send({
          name: 'Sofa',
          amount: '900.00',
          transactionDt: today,
          linkedAccountId: card,
          categoryId,
          type: 'Expense',
        })
        .expect(201)
    ).body

    const split = (
      await agent
        .post(`/transactions/${single.id}/installments`)
        .send({ count: 3, amountMode: 'total' })
        .expect(201)
    ).body as InstallmentGroup

    expect(split.installments.map((row) => row.amount)).toEqual([
      '300.00',
      '300.00',
      '300.00',
    ])
    expect(
      (await agent.get(`/transactions/${single.id}`).expect(200)).body.lifecycle
    ).toBe('DELETED')

    const collapsed = (
      await agent
        .post(`/transactions/installments/${split.groupId}/collapse`)
        .expect(201)
    ).body

    expect(collapsed.amount).toBe('900.00')
    expect(collapsed.installmentGroupId).toBeNull()
    expect(collapsed.statementId).toBe(split.installments[0].statementId)
    expect(await balanceOf(agent, card)).toBe('-900.00')
  })

  it('counts the full purchase against a limit in the purchase period', async () => {
    const own = await signUp(app)
    const settings = (await own.get('/settings').expect(200)).body
    const category = await createCategory(own)
    const card = await createAccount(own, {
      type: 'Credit Card',
      agency: null,
      number: null,
      balance: '0.00',
      limit: '5000.00',
      currency: settings.mainCurrency,
      ...cycle,
    })

    await own
      .post('/limits')
      .send({ categoryId: category, amount: '5000.00', type: 'Yearly' })
      .expect(201)
    await own
      .post('/transactions')
      .send({
        name: 'TV',
        amount: '1200.00',
        transactionDt: todayIn(settings.timezone),
        linkedAccountId: card,
        categoryId: category,
        type: 'Expense',
        installments: { count: 10 },
      })
      .expect(201)

    const usage = (await own.get('/limits/usage').expect(200)).body

    expect(usage[0].spent).toBe('1200.00')
  })
})
