import { createExecutionContext } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

import { signUp, startApp } from './support.js'

describe('tips calculators', () => {
  it('answers the simple vs compound baseline', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/tips/interest', {
      presentValue: '15000.00',
      rate: '10',
      periods: '15',
      unit: 'year',
    })

    expect(response.status).toBe(200)
    expect(response.body.rows.at(-1)).toMatchObject({
      simpleCapital: '37500.00',
      compoundCapital: '62658.72',
    })
  })

  it('rejects a negative principal with the shared DTO message', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/tips/interest', {
      presentValue: '-5000',
      rate: '10',
      periods: '15',
      unit: 'year',
    })

    expect(response.status).toBe(400)
    expect(response.body[0]).toMatchObject({
      path: ['presentValue'],
      message: 'Enter an amount like 12.34.',
    })
  })

  it('rejects more than 300 periods instead of capping them', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/tips/interest', {
      presentValue: '15000.00',
      rate: '10',
      periods: '1000',
      unit: 'year',
    })

    expect(response.status).toBe(400)
    expect(response.body[0]).toMatchObject({
      path: ['periods'],
      message: 'Enter a whole number from 0 to 300.',
    })
  })

  it('rejects zero years for the accumulation card', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/tips/accumulation', {
      target: '2000000.00',
      present: '25000.00',
      rate: '0.8',
      inflation: '0.2',
      adminFee: '0',
      loadingFee: '0',
      incomeTax: '15',
      years: '0',
    })

    expect(response.status).toBe(400)
    expect(response.body[0]).toMatchObject({
      path: ['years'],
      message: 'Enter a whole number from 1 to 100.',
    })
  })

  it('rejects a negative rent in buy or rent', async () => {
    const { app } = startApp()
    const agent = await signUp(app)

    const response = await agent.post('/api/tips/rent-vs-buy', {
      propertyValue: '400000.00',
      downPayment: '50000.00',
      mortgageRate: '12',
      propertyAppreciation: '4',
      termMonths: '360',
      system: 'SAC',
      monthlyRent: '-2000',
      investmentReturn: '12',
      rentIncrease: '4',
    })

    expect(response.status).toBe(400)
    expect(response.body[0]).toMatchObject({
      path: ['monthlyRent'],
      message: 'Enter an amount like 12.34.',
    })
  })

  it('requires a signed-in session', async () => {
    const { app, bindings } = startApp()

    const response = await app.fetch(
      new Request('http://localhost/api/tips/interest', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost',
        },
        body: JSON.stringify({
          presentValue: '15000.00',
          rate: '10',
          periods: '15',
          unit: 'year',
        }),
      }),
      bindings,
      createExecutionContext()
    )

    expect(response.status).toBe(401)
  })
})
