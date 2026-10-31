import {
  type Agent,
  balanceOf,
  createAccount,
  createCategory,
  signUp,
  startApp,
} from './support.js'

describe('the transaction ledger (e2e)', () => {
  const { app } = startApp()

  /** A signed-in agent with one category, per test (the storage isolates
   * per test). */
  async function session(): Promise<{ agent: Agent; categoryId: number }> {
    const agent = await signUp(app)

    return { agent, categoryId: await createCategory(agent) }
  }

  /** Creates an Expense on an account and answers its id. */
  const expense = async (
    agent: Agent,
    categoryId: number,
    accountId: number,
    overrides: Record<string, unknown> = {}
  ): Promise<number> => {
    const response = await agent.post('/api/transactions', {
      name: 'Groceries',
      amount: '200.00',
      transactionDt: '2026-10-14',
      linkedAccountId: accountId,
      categoryId,
      type: 'Expense',
      ...overrides,
    })
    expect(response.status).toBe(201)

    return response.body.id
  }

  /** The body a full update of the expense sends. */
  const updateBody = (
    id: number,
    categoryId: number,
    accountId: number,
    overrides = {}
  ) => ({
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
      const { agent, categoryId } = await session()
      const accountId = await createAccount(agent)
      const id = await expense(agent, categoryId, accountId)
      expect(await balanceOf(agent, accountId)).toBe('800.00')

      let response = await agent.patch(`/api/transactions/${id}/status`, {
        id,
        status: 'Canceled',
      })
      expect(response.status).toBe(200)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')

      response = await agent.patch(`/api/transactions/${id}/status`, {
        id,
        status: 'Checked',
      })
      expect(response.status).toBe(200)
      expect(await balanceOf(agent, accountId)).toBe('800.00')
    })

    it('leaves the balance alone between Checked and Verify', async () => {
      const { agent, categoryId } = await session()
      const accountId = await createAccount(agent)
      const id = await expense(agent, categoryId, accountId)

      const response = await agent.patch(`/api/transactions/${id}/status`, {
        id,
        status: 'Checked',
      })
      expect(response.status).toBe(200)
      expect(await balanceOf(agent, accountId)).toBe('800.00')
    })

    it("leaves the balance alone when a Canceled row's amount is edited", async () => {
      const { agent, categoryId } = await session()
      const accountId = await createAccount(agent)
      const id = await expense(agent, categoryId, accountId, {
        status: 'Canceled',
      })

      const response = await agent.put('/api/transactions', {
        ...updateBody(id, categoryId, accountId, {
          amount: '350.00',
          status: 'Canceled',
        }),
      })
      expect(response.status).toBe(200)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('reverts the delta when an edit saves the status Canceled', async () => {
      const { agent, categoryId } = await session()
      const accountId = await createAccount(agent)
      const id = await expense(agent, categoryId, accountId)

      const response = await agent.put('/api/transactions', {
        ...updateBody(id, categoryId, accountId, { status: 'Canceled' }),
      })
      expect(response.status).toBe(200)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('leaves the balance alone when a Canceled row is deleted', async () => {
      const { agent, categoryId } = await session()
      const accountId = await createAccount(agent)
      const id = await expense(agent, categoryId, accountId, {
        status: 'Canceled',
      })

      const response = await agent.delete(`/api/transactions/${id}`)
      expect(response.status).toBe(204)
      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('leaves the balance alone for a transaction created Canceled', async () => {
      const { agent, categoryId } = await session()
      const accountId = await createAccount(agent)

      await expense(agent, categoryId, accountId, { status: 'Canceled' })

      expect(await balanceOf(agent, accountId)).toBe('1000.00')
    })

    it('restores both accounts when one side of a transfer is canceled', async () => {
      const { agent, categoryId } = await session()
      const from = await createAccount(agent)
      const to = await createAccount(agent)
      const response = await agent.post('/api/transactions/transfer', {
        fromAccountId: from,
        toAccountId: to,
        categoryId,
        amount: '300.00',
        transactionDt: '2026-10-14',
      })
      expect(response.status).toBe(201)
      expect(await balanceOf(agent, from)).toBe('700.00')
      expect(await balanceOf(agent, to)).toBe('1300.00')

      const outId = response.body[0].id
      const canceled = await agent.patch(`/api/transactions/${outId}/status`, {
        id: outId,
        status: 'Canceled',
      })
      expect(canceled.status).toBe(200)

      expect(await balanceOf(agent, from)).toBe('1000.00')
      expect(await balanceOf(agent, to)).toBe('1000.00')
    })
  })

  describe('a transaction stays in its currency (#4)', () => {
    it('rejects a move BRL → USD and leaves both balances untouched', async () => {
      const { agent, categoryId } = await session()
      const brl = await createAccount(agent, { currency: 'BRL' })
      const usd = await createAccount(agent, { currency: 'USD' })
      const id = await expense(agent, categoryId, brl, { amount: '500.00' })

      const response = await agent.put('/api/transactions', {
        ...updateBody(id, categoryId, usd, { amount: '500.00' }),
      })

      expect(response.status).toBe(409)
      expect(response.body.message).toBe(
        'Move the transaction to an account of the same currency.'
      )
      expect(await balanceOf(agent, brl)).toBe('500.00')
      expect(await balanceOf(agent, usd)).toBe('1000.00')
    })

    it('moves BRL → another BRL account, updating both balances', async () => {
      const { agent, categoryId } = await session()
      const first = await createAccount(agent, { currency: 'BRL' })
      const second = await createAccount(agent, { currency: 'BRL' })
      const id = await expense(agent, categoryId, first, { amount: '500.00' })

      const response = await agent.put('/api/transactions', {
        ...updateBody(id, categoryId, second, { amount: '500.00' }),
      })

      expect(response.status).toBe(200)
      expect(await balanceOf(agent, first)).toBe('1000.00')
      expect(await balanceOf(agent, second)).toBe('500.00')
    })
  })

  describe('concurrent writes on two accounts (#17)', () => {
    it('settles 20 parallel A→B and B→A transfers without losing money', async () => {
      const { agent, categoryId } = await session()
      const a = await createAccount(agent)
      const b = await createAccount(agent)

      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          agent.post('/api/transactions/transfer', {
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
