import { describe, expect, it } from 'vitest'

import { type Agent, createAccount, signUp, startApp } from './support.js'

describe('the category breakdown after a category is deleted (e2e)', () => {
  const { app } = startApp()

  it('keeps a deleted category that still has spending', async () => {
    const agent = await signUp(app)
    const accountId = await createAccount(agent)
    const name = `cat-${crypto.randomUUID()}`
    const category = await agent.post('/api/categories', { name, color: '#1D4ED8' })
    expect(category.status).toBe(201)

    const expense = await agent.post('/api/transactions', {
      name: 'Entry',
      amount: '50.00',
      transactionDt: '2026-10-10',
      linkedAccountId: accountId,
      categoryId: category.body.id,
      type: 'Expense',
    })
    expect(expense.status).toBe(201)

    const deleted = await agent.delete(`/api/categories/${category.body.id}`)
    expect(deleted.status).toBe(204)

    expect(await breakdownNames(agent, accountId)).toContain(name)
  })
})

async function breakdownNames(agent: Agent, accountId: number): Promise<string[]> {
  const response = await agent.post('/api/transactions/breakdown', {
    linkedAccountId: accountId,
    dimension: 'category',
  })
  expect(response.status).toBe(201)

  return response.body.groups.flatMap((group: { items: { name: string }[] }) =>
    group.items.map((item) => item.name)
  )
}
