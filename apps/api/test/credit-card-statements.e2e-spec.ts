import {
  addDays,
  resolveStatement,
  todayIn,
  type CreditCardStatement,
} from '@workspace/poco'
import { createDatabase, type Database } from '@workspace/db'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { SystemClock } from '../src/common/clock/clock.js'
import { runRecurringForTenant } from '../src/recurring-transactions/recurring.jobs.js'
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
  const response = await agent.post('/api/transactions', {
    name: 'Purchase',
    amount,
    transactionDt,
    linkedAccountId: accountId,
    categoryId,
    type,
  })

  expect(response.status).toBe(201)

  return response.body
}

/** A card's bills read back, in close order. */
async function billsOf(agent: Agent, accountId: number, status?: string[]) {
  const response = await agent.post('/api/credit-card-statements/search', {
    sort: [{ field: 'closeDate', dir: 'asc' }],
    filter: { accountId, ...(status === undefined ? {} : { status }) },
    limit: 100,
  })

  expect(response.status).toBe(201)

  return response.body.items as Array<Record<string, unknown> & { id: number; status: string }>
}

describe('credit card statements (e2e, #5)', () => {
  let agent: Agent
  let tenantId: number
  let categoryId: number
  let today: string

  beforeAll(async () => {
    const { app } = startApp()
    agent = await signUp(app)
    categoryId = await createCategory(agent)

    const me = await agent.get('/api/auth/me')

    expect(me.status).toBe(200)
    tenantId = me.body.tenant.id

    const settings = await agent.get('/api/settings')

    expect(settings.status).toBe(200)
    today = todayIn(settings.body.timezone)
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

    const bill = (await agent.get(`/api/credit-card-statements/${first.statementId}`)).body as CreditCardStatement

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

    const canceledStatus = await agent.patch(
      `/api/transactions/${canceled.id}/status`,
      { id: canceled.id, status: 'Canceled' }
    )

    expect(canceledStatus.status).toBe(200)

    const removed = await agent.delete(`/api/transactions/${deleted.id}`)

    expect(removed.status).toBe(204)

    const [bill] = await billsOf(agent, card)

    expect(bill.id).toBe(kept.statementId)
    expect(bill.charges).toBe('10.00')
    expect(bill.transactionCount).toBe(1)
  })

  it('treats a transfer into a card as a payment and one out of it as a charge', async () => {
    const card = await createCard(agent)
    const checking = await createAccount(agent)
    const day = addDays(today, 40)

    const paid = await agent.post('/api/transactions/transfer', {
      fromAccountId: checking,
      toAccountId: card,
      categoryId,
      amount: '50.00',
      transactionDt: day,
    })
    const advance = await agent.post('/api/transactions/transfer', {
      fromAccountId: card,
      toAccountId: checking,
      categoryId,
      amount: '25.00',
      transactionDt: day,
    })

    expect(paid.status).toBe(201)
    expect(advance.status).toBe(201)

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
    const edit = async (transactionDt: string) => {
      const response = await agent.put('/api/transactions', {
        id: created.id,
        name: 'Purchase',
        amount: '100.00',
        transactionDt,
        linkedAccountId: card,
        categoryId,
        type: 'Expense',
      })

      expect(response.status).toBe(200)

      return response
    }

    const moved = await edit(addDays(day, 31))

    expect(moved.body.statementId).toBe(later.statementId)

    const pinned = await agent.patch(`/api/transactions/${created.id}/statement`, {
      statementId: created.statementId,
    })

    expect(pinned.status).toBe(200)
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

    const refused = await agent.patch(`/api/transactions/${created.id}/statement`, {
      statementId: foreign.statementId,
    })

    expect(refused.status).toBe(409)
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
    const account = (await agent.get(`/api/accounts/${card}`)).body

    const changed = await agent.put('/api/accounts', {
      ...account,
      closeDay: 10,
      dueDay: 20,
    })

    expect(changed.status).toBe(200)

    const pastAfter = (await agent.get(`/api/transactions/${past.id}`)).body
    const futureAfter = (await agent.get(`/api/transactions/${future.id}`)).body
    const expected = resolveStatement(
      { closeDay: 10, dueDay: 20, closeDayInclusive: false },
      future.transactionDt
    )

    expect(pastAfter.statementId).toBe(past.statementId)
    expect(futureAfter.statementId).not.toBe(future.statementId)
    expect(futureAfter.statementDueDate).toBe(expected.dueDate)

    const history = (await agent.get(`/api/transactions/${future.id}/history`)).body

    expect(history[0].action).toBe('UPDATE')
  })

  it('rejects a card whose close and due days match', async () => {
    const refused = await agent.post('/api/accounts', {
      name: 'Same day',
      type: 'Credit Card',
      balance: '0.00',
      currency: 'USD',
      limit: '100.00',
      closeDay: 5,
      dueDay: 5,
    })

    expect(refused.status).toBe(400)
  })

  it('asks before deleting a card that still owes', async () => {
    const card = await createCard(agent)

    await charge(agent, card, categoryId, addDays(today, -90))

    const refused = await agent.delete(`/api/accounts/${card}`)

    expect(refused.status).toBe(409)
    expect(refused.body.unpaidBills).toBe(1)
    expect(refused.body.amountDue).toBe('100.00')

    const confirmed = await agent.delete(`/api/accounts/${card}?confirmUnpaidBills=true`)

    expect(confirmed.status).toBe(204)
  })

  it('dates card charges by the bill due date in cash mode', async () => {
    const card = await createCard(agent)
    const day = addDays(today, 400)
    const window = resolveStatement(cycle, day)

    await charge(agent, card, categoryId, day, '75.00')

    const summary = async (creditMode: string, from: string, to: string) => {
      const response = await agent.post('/api/transactions/summary', {
        sort: [],
        filter: {
          linkedAccountId: card,
          transactionDtFrom: from,
          transactionDtTo: to,
          creditMode,
        },
      })

      expect(response.status).toBe(201)

      return response.body.groups
    }

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
    const receiver = await agent.post('/api/receivers', {
      name: 'Streaming',
      type: 'Service',
    })

    expect(receiver.status).toBe(201)

    const rule = await agent.post('/api/recurring-transactions', {
      receiverId: receiver.body.id,
      categoryId,
      linkedAccountId: card,
      amount: '9.90',
      type: 'Expense',
      frequency: 'Daily',
    })

    expect(rule.status).toBe(201)

    // The queue job the cron fans out: the rule was created today, so the
    // catch-up window materializes exactly today's charge.
    const db: Database = createDatabase(env.DB as never)
    const created = await runRecurringForTenant(db, new SystemClock(), tenantId)

    expect(created).toBe(1)

    const [bill] = await billsOf(agent, card)

    expect(bill.charges).toBe('9.90')
    expect(bill.closeDate).toBe(resolveStatement(cycle, today).closeDate)
  })
})
