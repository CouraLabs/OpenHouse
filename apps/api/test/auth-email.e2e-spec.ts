import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { signUp, startApp, uniqueEmail } from './support.js'

describe('one email is one user (e2e, #16)', () => {
  it('signs in with any casing of the email it signed up with', async () => {
    const { app } = startApp()
    const email = uniqueEmail()
    const agent = await signUp(app, email)

    const signedIn = await agent.post('/api/auth/sign-in', {
      email: `  ${email.toUpperCase()} `,
      password: 'password-a',
    })

    expect(signedIn.status).toBe(200)
  })

  it('stores the email lowercased and trimmed', async () => {
    const { app } = startApp()
    const email = uniqueEmail()
    const agent = await signUp(app, ` ${email.replace('user', 'User')} `)

    const me = await agent.get('/api/auth/me')

    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe(email)
  })

  it('rejects a second sign-up with the same email in another tenant', async () => {
    const { app } = startApp()
    const email = uniqueEmail()
    const agent = await signUp(app, email)

    const response = await agent.post('/api/auth/sign-up', {
      tenantName: `t-${randomUUID()}`,
      name: 'Ana',
      email: email.toUpperCase(),
      password: 'password-b',
    })

    expect(response.status).toBe(409)
    expect(response.body.message).toBe(
      'This email already has an account.'
    )
  })
})
