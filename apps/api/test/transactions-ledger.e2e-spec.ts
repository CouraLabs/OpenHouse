import type { INestApplication } from '@nestjs/common'
import type { App } from 'supertest/types.js'

import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

describe('the transaction ledger (e2e)', () => {
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

  /** Creates an Expense on an account and answers its id. */
  const expense = async (
    accountId: number,
    overrides: Record<string, unknown> = {}
  ): Promise<number> => {
    const response = await agent
      .post('/transactions')
      .send({
        name: 'Groceries',
        amount: '200.00',
        transactionDt: '2026-10-14',
        linkedAccountId: accountId,
        categoryId,
        type: 'Expense',
        ...overrides,
      })
      .expect(201)

    return response.body.id
  }

  /** The body a full update of the expense sends. */
  const updateBody = (id: number, accountId: number, overrides = {}) => ({
    id,
    name: 'Groceries',
    amount: '200.00',
    transactionDt: '2026-10-14',
    linkedAccountId: accountId,
    categoryId,
    type: 'Expense',
    status: 'Verify',
    ...overrides,
  })

  describe('a Canceled transaction moves no money (#1)', () => {
    it('reverts the balance on cancel and re-applies it on un-cancel', async () => {
      const accountId = await createAccount(agent)
      const id = await expense(accountId)
      expect(await balanceOf(agent, accountId)).toBe('800.00')

      await agent
        .patch(`/transactions/${id}/status`)
        .send({ id, status: 'Canceled' })
        .expect(200)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')

      await agent
        .patch(`/transactions/${id}/status`)
        .send({ id, status: 'Checked' })
        .expect(200)
      expect(await balanceOf(agent, accountId)).toBe('800.00')
    })

    it('leaves the balance alone between Checked and Verify', async () => {
      const accountId = await createAccount(agent)
      const id = await expense(accountId)

      await agent
        .patch(`/transactions/${id}/status`)
        .send({ id, status: 'Checked' })
        .expect(200)
      expect(await balanceOf(agent, accountId)).toBe('800.00')
    })

    it("leaves the balance alone when a Canceled row's amount is edited", async () => {
      const accountId = await createAccount(agent)
      const id = await expense(accountId, { status: 'Canceled' })

      await agent
        .put('/transactions')
        .send(
          updateBody(id, accountId, { amount: '350.00', status: 'Canceled' })
        )
        .expect(200)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('reverts the delta when an edit saves the status Canceled', async () => {
      const accountId = await createAccount(agent)
      const id = await expense(accountId)

      await agent
        .put('/transactions')
        .send(updateBody(id, accountId, { status: 'Canceled' }))
        .expect(200)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('leaves the balance alone when a Canceled row is deleted', async () => {
      const accountId = await createAccount(agent)
      const id = await expense(accountId, { status: 'Canceled' })

      await agent.delete(`/transactions/${id}`).expect(204)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('leaves the balance alone for a transaction created Canceled', async () => {
      const accountId = await createAccount(agent)
      await expense(accountId, { status: 'Canceled' })

      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('restores both accounts when one side of a transfer is canceled', async () => {
      const from = await createAccount(agent)
      const to = await createAccount(agent)
      const response = await agent
        .post('/transactions/transfer')
        .send({
          fromAccountId: from,
          toAccountId: to,
          categoryId,
          amount: '300.00',
          transactionDt: '2026-10-14',
        })
        .expect(201)
      expect(await balanceOf(agent, from)).toBe('700.00')
      expect(await balanceOf(agent, to)).toBe('1300.00')

      const outId = response.body[0].id
      await agent
        .patch(`/transactions/${outId}/status`)
        .send({ id: outId, status: 'Canceled' })
        .expect(200)

      expect(await balanceOf(agent, from)).toBe('1000.00')
      expect(await balanceOf(agent, to)).toBe('1000.00')
    })
  })

  describe('a transaction stays in its currency (#4)', () => {
    it('rejects a move BRL → USD and leaves both balances untouched', async () => {
      const brl = await createAccount(agent, { currency: 'BRL' })
      const usd = await createAccount(agent, { currency: 'USD' })
      const id = await expense(brl, { amount: '500.00' })

      const response = await agent
        .put('/transactions')
        .send(updateBody(id, usd, { amount: '500.00' }))
        .expect(409)

      expect(response.body.message).toBe(
        'Move the transaction to an account of the same currency.'
      )
      expect(await balanceOf(agent, brl)).toBe('500.00')
      expect(await balanceOf(agent, usd)).toBe('1000.00')
    })

    it('moves BRL → another BRL account, updating both balances', async () => {
      const first = await createAccount(agent, { currency: 'BRL' })
      const second = await createAccount(agent, { currency: 'BRL' })
      const id = await expense(first, { amount: '500.00' })

      await agent
        .put('/transactions')
        .send(updateBody(id, second, { amount: '500.00' }))
        .expect(200)

      expect(await balanceOf(agent, first)).toBe('1000.00')
      expect(await balanceOf(agent, second)).toBe('500.00')
    })
  })

  describe('concurrent writes on two accounts (#17)', () => {
    it('settles 20 parallel A→B and B→A transfers without losing money', async () => {
      const a = await createAccount(agent)
      const b = await createAccount(agent)

      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          agent.post('/transactions/transfer').send({
            fromAccountId: index % 2 === 0 ? a : b,
            toAccountId: index % 2 === 0 ? b : a,
            categoryId,
            amount: `${index + 1}.00`,
            transactionDt: '2026-10-14',
          })
        )
      )

      expect(responses.map((response) => response.status)).toEqual(
        Array(20).fill(201)
      )

      // Even indices sent A→B (1+3+…+19 = 100), odd sent B→A (2+4+…+20 = 110).
      expect(await balanceOf(agent, a)).toBe('1010.00')
      expect(await balanceOf(agent, b)).toBe('990.00')
    })
  })
})
