
import type { INestApplication } from '@nestjs/common'
import {
  addDays,
  resolveStatement,
  todayIn,
  type CreditCardStatement,
} from '@workspace/poco'
import type { App } from 'supertest/types.js'

import { RecurringRunService } from '../src/recurring-transactions/recurring-run.service.js'
import {
  type Agent,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

const cycle = { closeDay: 25, dueDay: 5, closeDayInclusive: false }

/** Creates a credit card closing on the 25th, due on the 5th. */
function createCard(agent: Agent, overrides: Record<string, unknown> = {}) {
  return createAccount(agent, {
    type: 'Credit Card',
    agency: null,
    number: null,
    balance: '0.00',
    limit: '5000.00',
    closeDay: cycle.closeDay,
    dueDay: cycle.dueDay,
    ...overrides,
  })
}

/** Records a transaction and answers the response body. */
async function charge(
  agent: Agent,
  accountId: number,
  categoryId: number,
  transactionDt: string,
  amount = '100.00',
  type: 'Expense' | 'Income' = 'Expense'
) {
  const response = await agent
    .post('/transactions')
    .send({
      name: 'Purchase',
      amount,
      transactionDt,
      linkedAccountId: accountId,
      categoryId,
      type,
    })
    .expect(201)

  return response.body
}

/** A card's bills read back, in close order. */
async function billsOf(agent: Agent, accountId: number, status?: string[]) {
  const response = await agent
    .post('/credit-card-statements/search')
    .send({
      sort: [{ field: 'closeDate', dir: 'asc' }],
      filter: { accountId, ...(status === undefined ? {} : { status }) },
      limit: 100,
    })
    .expect(201)

  return response.body.items as Array<Record<string, unknown> & { id: number; status: string }>
}

describe('credit card statements (e2e, #5)', () => {
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

  it('places a card charge on its bill and totals the bill', async () => {
    const card = await createCard(agent)
    const day = addDays(today, -90)
    const window = resolveStatement(cycle, day)

    const first = await charge(agent, card, categoryId, day, '120.00')
    await charge(agent, card, categoryId, day, '30.00', 'Income')

    expect(first.statementId).not.toBeNull()
    expect(first.statementDueDate).toBe(window.dueDate)
    expect(first.warning).toBe('STATEMENT_CLOSED')

    const bill = (
      await agent
        .get(`/credit-card-statements/${first.statementId}`)
        .expect(200)
    ).body as CreditCardStatement

    expect(bill).toMatchObject({
      closeDate: window.closeDate,
      dueDate: window.dueDate,
      periodStart: window.periodStart,
      charges: '120.00',
      credits: '30.00',
      total: '90.00',
      previousBalance: '0.00',
      amountDue: '90.00',
      status: 'Overdue',
    })
  })

  it('answers an open bill with no warning', async () => {
    const card = await createCard(agent)
    const created = await charge(agent, card, categoryId, addDays(today, 40))
    const [bill] = await billsOf(agent, card)

    expect(created.warning).toBeNull()
    expect(bill.status).toBe('Open')
  })

  it('leaves canceled and deleted charges out of the totals', async () => {
    const card = await createCard(agent)
    const day = addDays(today, 40)
    const kept = await charge(agent, card, categoryId, day, '10.00')
    const canceled = await charge(agent, card, categoryId, day, '20.00')
    const deleted = await charge(agent, card, categoryId, day, '40.00')

    await agent
      .patch(`/transactions/${canceled.id}/status`)
      .send({ id: canceled.id, status: 'Canceled' })
      .expect(200)
    await agent.delete(`/transactions/${deleted.id}`).expect(204)

    const [bill] = await billsOf(agent, card)

    expect(bill.id).toBe(kept.statementId)
    expect(bill.charges).toBe('10.00')
    expect(bill.transactionCount).toBe(1)
  })

  it('treats a transfer into a card as a payment and one out of it as a charge', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const day = addDays(today, 40)

    const paid = await agent
      .post('/transactions/transfer')
      .send({
        fromAccountId: checking,
        toAccountId: card,
        categoryId,
        amount: '50.00',
        transactionDt: day,
      })
      .expect(201)
    const advance = await agent
      .post('/transactions/transfer')
      .send({
        fromAccountId: card,
        toAccountId: checking,
        categoryId,
        amount: '25.00',
        transactionDt: day,
      })
      .expect(201)

    const [, cardSide] = paid.body
    const [cardCharge, checkingSide] = advance.body

    expect(cardSide.statementId).toBeNull()
    expect(checkingSide.statementId).toBeNull()
    expect(cardCharge.statementId).not.toBeNull()
    // The payment settles a bill (#7) — today's, the card having no other
    // — without landing on one by its day.
    expect(cardSide.paymentStatementId).not.toBeNull()

    const bills = await billsOf(agent, card)
    const charged = bills.find((bill) => bill.id === cardCharge.statementId)

    expect(charged?.charges).toBe('25.00')
    expect(charged?.paid).toBe('0.00')
  })

  it('opens one bill for concurrent first charges', async () => {
    const card = await createCard(agent)
    const day = addDays(today, 40)

    const created = await Promise.all(
      Array.from({ length: 6 }, () => charge(agent, card, categoryId, day))
    )

    expect(new Set(created.map((row) => row.statementId)).size).toBe(1)
    expect(await billsOf(agent, card)).toHaveLength(1)
  })

  it('re-resolves a date edit, but not once the charge is pinned', async () => {
    const card = await createCard(agent)
    const day = addDays(today, 40)
    const created = await charge(agent, card, categoryId, day)
    const later = await charge(agent, card, categoryId, addDays(day, 31))
    const edit = (transactionDt: string) =>
      agent
        .put('/transactions')
        .send({
          id: created.id,
          name: 'Purchase',
          amount: '100.00',
          transactionDt,
          linkedAccountId: card,
          categoryId,
          type: 'Expense',
        })
        .expect(200)

    const moved = await edit(addDays(day, 31))

    expect(moved.body.statementId).toBe(later.statementId)

    const pinned = await agent
      .patch(`/transactions/${created.id}/statement`)
      .send({ statementId: created.statementId })
      .expect(200)

    expect(pinned.body.statementPinned).toBe(true)
    expect(pinned.body.statementId).toBe(created.statementId)

    const kept = await edit(addDays(day, 62))

    expect(kept.body.statementId).toBe(created.statementId)
  })

  it('refuses to move a charge to another card’s bill', async () => {
    const card = await createCard(agent)
    const other = await createCard(agent)
    const created = await charge(agent, card, categoryId, addDays(today, 40))
    const foreign = await charge(agent, other, categoryId, addDays(today, 40))

    await agent
      .patch(`/transactions/${created.id}/statement`)
      .send({ statementId: foreign.statementId })
      .expect(409)
  })

  it('carries an unpaid bill into the next one', async () => {
    const card = await createCard(agent)
    const day = addDays(today, -120)

    await charge(agent, card, categoryId, day, '100.00')
    await charge(agent, card, categoryId, addDays(day, 31), '40.00')

    const [first, second] = await billsOf(agent, card)

    expect(first.amountDue).toBe('100.00')
    expect(second.previousBalance).toBe('100.00')
    expect(second.amountDue).toBe('140.00')
  })

  it('filters by status exactly as each bill derives it', async () => {
    const card = await createCard(agent)

    await charge(agent, card, categoryId, addDays(today, -120))
    await charge(agent, card, categoryId, addDays(today, 40))

    const every = await billsOf(agent, card)

    for (const status of ["Open", "Closed", "Overdue", "Paid"] as string[]) {
      const filtered = await billsOf(agent, card, [status])

      expect(filtered.map((bill) => bill.id)).toEqual(
        every
          .filter((bill) => bill.status === status)
          .map((bill: { id: number }) => bill.id)
      )
    }
  })

  it('re-resolves only the Open bills when the close day changes', async () => {
    const card = await createCard(agent)
    const past = await charge(agent, card, categoryId, addDays(today, -120))
    const future = await charge(agent, card, categoryId, addDays(today, 70))
    const account = (await agent.get(`/accounts/${card}`).expect(200)).body

    await agent
      .put('/accounts')
      .send({ ...account, closeDay: 10, dueDay: 20 })
      .expect(200)

    const pastAfter = (await agent.get(`/transactions/${past.id}`).expect(200))
      .body
    const futureAfter = (
      await agent.get(`/transactions/${future.id}`).expect(200)
    ).body
    const expected = resolveStatement(
      { closeDay: 10, dueDay: 20, closeDayInclusive: false },
      future.transactionDt
    )

    expect(pastAfter.statementId).toBe(past.statementId)
    expect(futureAfter.statementId).not.toBe(future.statementId)
    expect(futureAfter.statementDueDate).toBe(expected.dueDate)

    const history = (
      await agent.get(`/transactions/${future.id}/history`).expect(200)
    ).body

    expect(history[0].action).toBe('UPDATE')
  })

  it('rejects a card whose close and due days match', async () => {
    await agent
      .post('/accounts')
      .send({
        name: 'Same day',
        type: 'Credit Card',
        balance: '0.00',
        currency: 'USD',
        limit: '100.00',
        closeDay: 5,
        dueDay: 5,
      })
      .expect(409)
  })

  it('asks before deleting a card that still owes', async () => {
    const card = await createCard(agent)

    await charge(agent, card, categoryId, addDays(today, -90))

    const refused = await agent.delete(`/accounts/${card}`).expect(409)

    expect(refused.body.unpaidBills).toBe(1)
    expect(refused.body.amountDue).toBe('100.00')

    await agent.delete(`/accounts/${card}?confirmUnpaidBills=true`).expect(204)
  })

  it('dates card charges by the bill due date in cash mode', async () => {
    const card = await createCard(agent)
    const day = addDays(today, 400)
    const window = resolveStatement(cycle, day)

    await charge(agent, card, categoryId, day, '75.00')

    const summary = async (creditMode: string, from: string, to: string) =>
      (
        await agent
          .post('/transactions/summary')
          .send({
            sort: [],
            filter: {
              linkedAccountId: card,
              transactionDtFrom: from,
              transactionDtTo: to,
              creditMode,
            },
          })
          .expect(201)
      ).body.groups

    expect(await summary('accrual', day, day)).toMatchObject([
      { creditExpenses: '75.00' },
    ])
    expect(await summary('cash', day, day)).toEqual([])
    expect(await summary('cash', window.dueDate, window.dueDate)).toMatchObject(
      [{ creditExpenses: '75.00' }]
    )
  })

  it('places a recurring rule’s charge on its bill', async () => {
    const card = await createCard(agent)
    const receiver = await agent
      .post('/receivers')
      .send({ name: 'Streaming', type: 'Service' })
      .expect(201)

    await agent
      .post('/recurring-transactions')
      .send({
        receiverId: receiver.body.id,
        categoryId,
        linkedAccountId: card,
        amount: '9.90',
        type: 'Expense',
        frequency: 'Daily',
      })
      .expect(201)

    await app.get(RecurringRunService).runDue()

    const [bill] = await billsOf(agent, card)

    expect(bill.charges).toBe('9.90')
    expect(bill.closeDate).toBe(resolveStatement(cycle, today).closeDate)
  })

})
