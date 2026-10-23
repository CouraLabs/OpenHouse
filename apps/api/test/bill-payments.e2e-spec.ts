import type { INestApplication } from '@nestjs/common'
import {
  addDays,
  CARD_PAYMENT_CATEGORY,
  resolveStatement,
  todayIn,
  type CreditCardStatement,
  type StatementStatus,
} from '@workspace/poco'
import type { App } from 'supertest/types.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  type Agent,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

const cycle = { closeDay: 25, dueDay: 5, closeDayInclusive: false }

/** Creates a credit card closing on the 25th, due on the 5th. */
function createCard(agent: Agent) {
  return createAccount(agent, {
    type: 'Credit Card',
    agency: null,
    number: null,
    balance: '0.00',
    limit: '5000.00',
    closeDay: cycle.closeDay,
    dueDay: cycle.dueDay,
  })
}

/** Records a card charge and answers the response body. */
async function charge(
  agent: Agent,
  accountId: number,
  categoryId: number,
  transactionDt: string,
  amount = '100.00'
) {
  const response = await agent
    .post('/transactions')
    .send({
      name: 'Purchase',
      amount,
      transactionDt,
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
    })
    .expect(201)

  return response.body
}

/** Pays a card from an account; answers both sides of the transfer. */
async function pay(
  agent: Agent,
  body: {
    fromAccountId: number
    toAccountId: number
    amount: string
    transactionDt: string
    paymentStatementId?: number
    categoryId?: number
  }
) {
  const response = await agent
    .post('/transactions/transfer')
    .send(body)
    .expect(201)

  return response.body as [{ id: number }, { id: number; categoryId: number }]
}

async function bill(agent: Agent, id: number): Promise<CreditCardStatement> {
  return (await agent.get(`/credit-card-statements/${id}`).expect(200)).body
}

/** The status a closed bill that is not paid in full takes on a day. */
function unpaidStatus(
  closed: CreditCardStatement,
  today: string,
  paidSome: boolean
): StatementStatus {
  if (today > closed.dueDate) {
    return 'Overdue'
  }

  return paidSome ? 'PartiallyPaid' : 'Closed'
}

describe('bill payment and reconciliation (e2e, #7)', () => {
  let app: INestApplication<App>
  let agent: Agent
  let categoryId: number
  let today: string

  beforeAll(async () => {
    app = await startApp()
    agent = await signUp(app)
    categoryId = await createCategory(agent)

    const settings = await agent.get('/settings').expect(200)
    today = todayIn(settings.body.timezone)
  })

  afterAll(async () => {
    await app.close()
  })

  /** A card with one closed bill of 100.00, and a checking account. */
  async function closedBill() {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const charged = await charge(agent, card, categoryId, addDays(today, -60))

    return { card, checking, statementId: charged.statementId as number }
  }

  it('pays a bill in full and in part', async () => {
    const { card, checking, statementId } = await closedBill()

    await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '40.00',
      transactionDt: today,
      paymentStatementId: statementId,
      categoryId,
    })

    const partly = await bill(agent, statementId)

    expect(partly.paid).toBe('40.00')
    expect(partly.amountDue).toBe('60.00')
    expect(partly.status).toBe(unpaidStatus(partly, today, true))

    await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '60.00',
      transactionDt: today,
      paymentStatementId: statementId,
      categoryId,
    })

    const settled = await bill(agent, statementId)

    expect(settled.paid).toBe('100.00')
    expect(settled.amountDue).toBe('0.00')
    expect(settled.status).toBe('Paid')
  })

  it('settles the chosen bill even when paid inside the next period', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    // A bill closed yesterday-ish, and a charge on the bill running now.
    const closedDay = addDays(resolveStatement(cycle, today).periodStart, -1)
    const older = await charge(agent, card, categoryId, closedDay)
    const current = await charge(agent, card, categoryId, today)

    await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '100.00',
      transactionDt: today,
      paymentStatementId: older.statementId,
      categoryId,
    })

    expect((await bill(agent, older.statementId)).paid).toBe('100.00')
    expect((await bill(agent, current.statementId)).paid).toBe('0.00')
  })

  it('carries an unpaid remainder into the next bill', async () => {
    const { card, checking, statementId } = await closedBill()
    const first = await bill(agent, statementId)
    const next = await charge(agent, card, categoryId, first.closeDate, '10.00')

    await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '30.00',
      transactionDt: today,
      paymentStatementId: statementId,
      categoryId,
    })

    const after = await bill(agent, statementId)
    const following = await bill(agent, next.statementId)

    expect(following.previousBalance).toBe('70.00')
    expect(following.amountDue).toBe('80.00')
    expect(after.carriedTo).toBe(following.dueDate)
  })

  it('carries an overpayment into the next bill as a credit', async () => {
    const { card, checking, statementId } = await closedBill()
    const first = await bill(agent, statementId)
    const next = await charge(agent, card, categoryId, first.closeDate, '10.00')

    await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '150.00',
      transactionDt: today,
      paymentStatementId: statementId,
      categoryId,
    })

    const after = await bill(agent, statementId)
    const following = await bill(agent, next.statementId)

    expect(after.status).toBe('Paid')
    expect(after.amountDue).toBe('-50.00')
    expect(following.previousBalance).toBe('-50.00')
    expect(following.amountDue).toBe('-40.00')
  })

  it('records a plain transfer into a card as a payment on the oldest unpaid bill', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const oldest = await charge(agent, card, categoryId, addDays(today, -90))
    await charge(agent, card, categoryId, addDays(today, -60))

    const [, cardSide] = await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '25.00',
      transactionDt: today,
      categoryId,
    })
    const read = (await agent.get(`/transactions/${cardSide.id}`).expect(200))
      .body

    expect(read.paymentStatementId).toBe(oldest.statementId)
    expect((await bill(agent, oldest.statementId)).paid).toBe('25.00')
  })

  it('fetches or creates the card payment category once, under races', async () => {
    const own = await signUp(app)
    const card = await createCard(own)
    const checking = await createAccount(own)
    await charge(own, card, await createCategory(own), addDays(today, -60))

    const paid = await Promise.all(
      Array.from({ length: 5 }, () =>
        pay(own, {
          fromAccountId: checking,
          toAccountId: card,
          amount: '1.00',
          transactionDt: today,
        })
      )
    )
    const ids = new Set(paid.map(([, cardSide]) => cardSide.categoryId))
    const listed = (await own.get('/categories').expect(200)).body as Array<{
      name: string
    }>

    expect(ids.size).toBe(1)
    expect(
      listed.filter((category) => category.name === CARD_PAYMENT_CATEGORY.name)
    ).toHaveLength(1)
  })

  it('shows an early payment of an Open bill as prepaid', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const open = await charge(agent, card, categoryId, today)

    await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '20.00',
      transactionDt: today,
      paymentStatementId: open.statementId,
      categoryId,
    })

    const prepaid = await bill(agent, open.statementId)

    expect(prepaid.status).toBe('Open')
    expect(prepaid.paid).toBe('20.00')
  })

  it('restores the previous status when a payment is deleted', async () => {
    const { card, checking, statementId } = await closedBill()
    const before = await bill(agent, statementId)
    const [, cardSide] = await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '100.00',
      transactionDt: today,
      paymentStatementId: statementId,
      categoryId,
    })

    expect((await bill(agent, statementId)).status).toBe('Paid')

    await agent.delete(`/transactions/${cardSide.id}`).expect(204)

    const after = await bill(agent, statementId)

    expect(after.paid).toBe('0.00')
    expect(after.status).toBe(before.status)
  })

  it('moves a payment to another bill of the card', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    // 40 days apart: a cycle spans at most 31, so the two charges can never
    // share a bill whatever day the suite runs on.
    const older = await charge(agent, card, categoryId, addDays(today, -100))
    const newer = await charge(agent, card, categoryId, addDays(today, -60))
    const [, cardSide] = await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '50.00',
      transactionDt: today,
      paymentStatementId: older.statementId,
      categoryId,
    })

    const moved = await agent
      .patch(`/transactions/${cardSide.id}/statement`)
      .send({ statementId: newer.statementId })
      .expect(200)

    expect(moved.body.paymentStatementId).toBe(newer.statementId)
    expect(moved.body.statementId).toBeNull()
    expect((await bill(agent, older.statementId)).paid).toBe('0.00')
    expect((await bill(agent, newer.statementId)).paid).toBe('50.00')
  })

  it('rejects a bill of another card', async () => {
    const { card: other, statementId } = await closedBill()
    const card = await createCard(agent)
    const checking = await createAccount(agent)

    expect(other).not.toBe(card)

    await agent
      .post('/transactions/transfer')
      .send({
        fromAccountId: checking,
        toAccountId: card,
        amount: '5.00',
        transactionDt: today,
        paymentStatementId: statementId,
        categoryId,
      })
      .expect(409)
  })

  it('keeps a prepaid bill through a change of the card days', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const [, cardSide] = await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '20.00',
      transactionDt: today,
      categoryId,
    })
    const paid = (await agent.get(`/transactions/${cardSide.id}`).expect(200))
      .body
    const account = (await agent.get(`/accounts/${card}`).expect(200)).body

    await agent
      .put('/accounts')
      .send({ ...account, closeDay: 10, dueDay: 20 })
      .expect(200)

    expect((await bill(agent, paid.paymentStatementId)).paid).toBe('20.00')
  })

  it('reconciles a bill once the bank total matches', async () => {
    const { statementId } = await closedBill()

    await agent
      .patch(`/credit-card-statements/${statementId}`)
      .send({ minimumDue: '15.00', bankTotal: '110.00' })
      .expect(200)

    const mismatch = await agent
      .post(`/credit-card-statements/${statementId}/reconcile`)
      .send({ bankTotal: '110.00' })
      .expect(409)

    expect(mismatch.body.total).toBe('100.00')

    const reconciled = await agent
      .post(`/credit-card-statements/${statementId}/reconcile`)
      .send({ bankTotal: '100.00' })
      .expect(201)

    expect(reconciled.body.reconciledAt).not.toBeNull()
    expect(reconciled.body.minimumDue).toBe('15.00')
    expect(reconciled.body.bankTotal).toBe('100.00')

    const rows = (
      await agent
        .post('/transactions/search')
        .send({ filter: { statementId }, limit: 50 })
        .expect(201)
    ).body.items as Array<{ status: string }>

    expect(rows.every((row) => row.status === 'Checked')).toBe(true)
  })
})
