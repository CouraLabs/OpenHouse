import { describe, expect, it } from 'vitest'

import { createAccount, signUp, startApp } from './support.js'

describe('an account number is an identifier (e2e, #3)', () => {
  it('round-trips 00012345-6 unchanged through create, read, and edit', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const id = await createAccount(agent, { number: '00012345-6' })

    const created = await agent.get(`/api/accounts/${id}`)
    expect(created.status).toBe(200)
    expect(created.body.number).toBe('00012345-6')

    const { createdDt, updateDt, status, ...body } = created.body
    const edited = await agent.put('/api/accounts', {
      ...body,
      name: 'Renamed',
    })
    expect(edited.status).toBe(200)

    const read = await agent.get(`/api/accounts/${id}`)
    expect(read.status).toBe(200)
    expect(read.body.number).toBe('00012345-6')
  })

  it('keeps a number past the old integer range', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const id = await createAccount(agent, { number: '98765432109876' })

    const read = await agent.get(`/api/accounts/${id}`)
    expect(read.status).toBe(200)
    expect(read.body.number).toBe('98765432109876')
  })
})
