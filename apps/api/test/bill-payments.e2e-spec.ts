import { addDays, resolveStatement, todayIn } from '@workspace/business'
import { CARD_PAYMENT_CATEGORY } from '@workspace/business/testing'
import { type CreditCardStatement, type StatementStatus } from '@workspace/dto'
import { describe, expect, it } from 'vitest'

import {
  type Agent,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

const cycle = { closeDay: 25, dueDay: 5, closeDayInclusive: false }

describe('bill payment and reconciliation (e2e, #7)', () => {
  const { app } = startApp()

  /** A signed-in agent with one category and the tenant's today. */
  async function session(): Promise<{
    agent: Agent
    categoryId: number
    today: string
  }> {
    const agent = await signUp(app)
    const categoryId = await createCategory(agent)
    const settings = await agent.get('/api/settings')
    expect(settings.status).toBe(200)

    return { agent, categoryId, today: todayIn(settings.body.timezone) }
  }

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
    const response = await agent.post('/api/transactions', {
      name: 'Purchase',
      amount,
      transactionDt,
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
    })
    expect(response.status).toBe(201)

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
    const response = await agent.post('/api/transactions/transfer', body)
    // A failure reports the response body, so a flaky 500 names its cause.
    if (response.status !== 201) {
      throw new Error(
        `transfer ${response.status}: ${JSON.stringify(response.body)}`
      )
    }

    return response.body as [{ id: number }, { id: number; categoryId: number }]
  }

  async function bill(agent: Agent, id: number): Promise<CreditCardStatement> {
    const response = await agent.get(`/api/credit-card-statements/${id}`)
    expect(response.status).toBe(200)

    return response.body
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

  /** A card with one closed bill of 100.00, and a checking account. */
  async function closedBill(agent: Agent, categoryId: number, today: string) {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const charged = await charge(agent, card, categoryId, addDays(today, -60))

    return { card, checking, statementId: charged.statementId as number }
  }

  it('pays a bill in full and in part', async () => {
    const { agent, categoryId, today } = await session()
    const { card, checking, statementId } = await closedBill(
      agent,
      categoryId,
      today
    )

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
    const { agent, categoryId, today } = await session()
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
    const { agent, categoryId, today } = await session()
    const { card, checking, statementId } = await closedBill(
      agent,
      categoryId,
      today
    )
    const first = await bill(agent, statementId)
    expect(first.accountId).toBe(card)
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
    const { agent, categoryId, today } = await session()
    const { card, checking, statementId } = await closedBill(
      agent,
      categoryId,
      today
    )
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
    const { agent, categoryId, today } = await session()
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
    const read = await agent.get(`/api/transactions/${cardSide.id}`)
    expect(read.status).toBe(200)

    expect(read.body.paymentStatementId).toBe(oldest.statementId)
    expect((await bill(agent, oldest.statementId)).paid).toBe('25.00')
  })

  it('fetches or creates the card payment category once, under races', async () => {
    const own = await signUp(app)
    const card = await createCard(own)
    const checking = await createAccount(own)
    const settings = await own.get('/api/settings')
    expect(settings.status).toBe(200)
    const today = todayIn(settings.body.timezone)
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
    const listed = await own.get('/api/categories')
    expect(listed.status).toBe(200)

    const named = (listed.body as Array<{ name: string }>).filter(
      (category) => category.name === CARD_PAYMENT_CATEGORY.name
    )
    expect(ids.size).toBe(1)
    expect(named).toHaveLength(1)
  })

  it('shows an early payment of an Open bill as prepaid', async () => {
    const { agent, categoryId, today } = await session()
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
    const { agent, categoryId, today } = await session()
    const { card, checking, statementId } = await closedBill(
      agent,
      categoryId,
      today
    )
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

    const deleted = await agent.delete(`/api/transactions/${cardSide.id}`)
    expect(deleted.status).toBe(204)

    const after = await bill(agent, statementId)

    expect(after.paid).toBe('0.00')
    expect(after.status).toBe(before.status)
  })

  it('moves a payment to another bill of the card', async () => {
    const { agent, categoryId, today } = await session()
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

    const moved = await agent.patch(
      `/api/transactions/${cardSide.id}/statement`,
      { statementId: newer.statementId }
    )
    expect(moved.status).toBe(200)

    expect(moved.body.paymentStatementId).toBe(newer.statementId)
    expect(moved.body.statementId).toBeNull()
    expect((await bill(agent, older.statementId)).paid).toBe('0.00')
    expect((await bill(agent, newer.statementId)).paid).toBe('50.00')
  })

  it('rejects a bill of another card', async () => {
    const { agent, categoryId, today } = await session()
    const { card: other, statementId } = await closedBill(
      agent,
      categoryId,
      today
    )
    const card = await createCard(agent)
    const checking = await createAccount(agent)

    expect(other).not.toBe(card)

    const response = await agent.post('/api/transactions/transfer', {
      fromAccountId: checking,
      toAccountId: card,
      amount: '5.00',
      transactionDt: today,
      paymentStatementId: statementId,
      categoryId,
    })

    expect(response.status).toBe(409)
  })

  it('keeps a prepaid bill through a change of the card days', async () => {
    const { agent, categoryId, today } = await session()
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const [, cardSide] = await pay(agent, {
      fromAccountId: checking,
      toAccountId: card,
      amount: '20.00',
      transactionDt: today,
      categoryId,
    })
    const paid = await agent.get(`/api/transactions/${cardSide.id}`)
    expect(paid.status).toBe(200)
    const account = await agent.get(`/api/accounts/${card}`)
    expect(account.status).toBe(200)

    const updated = await agent.put('/api/accounts', {
      ...account.body,
      closeDay: 10,
      dueDay: 20,
    })
    expect(updated.status).toBe(200)

    const after = await bill(agent, paid.body.paymentStatementId)
    expect(after.paid).toBe('20.00')
  })

  it('reconciles a bill once the bank total matches', async () => {
    const { agent, categoryId, today } = await session()
    const { statementId } = await closedBill(agent, categoryId, today)

    const patched = await agent.patch(
      `/api/credit-card-statements/${statementId}`,
      { minimumDue: '15.00', bankTotal: '110.00' }
    )
    expect(patched.status).toBe(200)

    const mismatch = await agent.post(
      `/api/credit-card-statements/${statementId}/reconcile`,
      { bankTotal: '110.00' }
    )
    expect(mismatch.status).toBe(409)
    expect(mismatch.body.total).toBe('100.00')

    const reconciled = await agent.post(
      `/api/credit-card-statements/${statementId}/reconcile`,
      { bankTotal: '100.00' }
    )
    expect(reconciled.status).toBe(201)
    expect(reconciled.body.reconciledAt).not.toBeNull()
    expect(reconciled.body.minimumDue).toBe('15.00')
    expect(reconciled.body.bankTotal).toBe('100.00')

    const search = await agent.post('/api/transactions/search', {
      filter: { statementId },
      limit: 50,
    })
    expect(search.status).toBe(201)

    const rows = search.body.items as Array<{ status: string }>
    expect(rows.every((row) => row.status === 'Checked')).toBe(true)
  })
})
