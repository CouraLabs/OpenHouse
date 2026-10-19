import type { INestApplication } from '@nestjs/common'
import type { App } from 'supertest/types.js'

import { type Agent, createAccount, signUp, startApp } from './support.js'

describe('an account number is an identifier (e2e, #3)', () => {
  let app: INestApplication<App>
  let agent: Agent

  beforeAll(async () => {
    app = await startApp()
    agent = await signUp(app)
  })

  afterAll(async () => {
    await app.close()
  })

  it('round-trips 00012345-6 unchanged through create, read, and edit', async () => {
    const id = await createAccount(agent, { number: '00012345-6' })

    const created = await agent.get(`/accounts/${id}`).expect(200)
    expect(created.body.number).toBe('00012345-6')

    const { createdDt, updateDt, status, ...body } = created.body
    await agent
      .put('/accounts')
      .send({ ...body, name: 'Renamed' })
      .expect(200)

    const edited = await agent.get(`/accounts/${id}`).expect(200)
    expect(edited.body.number).toBe('00012345-6')
  })

  it('keeps a number past the old integer range', async () => {
    const id = await createAccount(agent, { number: '98765432109876' })

    const read = await agent.get(`/accounts/${id}`).expect(200)
    expect(read.body.number).toBe('98765432109876')
  })
})
