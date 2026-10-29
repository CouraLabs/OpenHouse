import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { App } from 'supertest/types.js'

import { signUp, startApp, uniqueEmail } from './support.js'

describe('one email is one user (e2e, #16)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('signs in with any casing of the email it signed up with', async () => {
    const email = uniqueEmail()
    await signUp(app, email)

    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: `  ${email.toUpperCase()} `, password: 'password-a' })
      .expect(200)
  })

  it('stores the email lowercased and trimmed', async () => {
    const email = uniqueEmail()
    const agent = await signUp(app, ` ${email.replace('user', 'User')}`)

    const me = await agent.get('/auth/me').expect(200)

    expect(me.body.user.email).toBe(email)
  })

  it('rejects a second sign-up with the same email in another tenant', async () => {
    const email = uniqueEmail()
    await signUp(app, email)

    const response = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({
        tenantName: `t-${randomUUID()}`,
        name: 'Ana',
        email: email.toUpperCase(),
        password: 'password-b',
      })
      .expect(409)

    expect(response.body.message).toBe('This email already has an account.')
  })
})
