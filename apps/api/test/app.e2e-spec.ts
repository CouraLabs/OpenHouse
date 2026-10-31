import { describe, expect, it } from 'vitest'

import { startApp, signUp } from './support.js'

describe('the session guard (e2e)', () => {
  // The app is built per spec; the storage is per-test isolated.
  const { app } = startApp()

  it('answers the health route without a session', async () => {
    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
  })

  it('rejects a request without a session', async () => {
    const response = await app.request('/api/settings')

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      message: 'Missing session.',
      error: 'Unauthorized',
      statusCode: 401,
    })
  })

  it('rejects a request whose access cookie does not verify', async () => {
    const response = await app.request('/api/settings', {
      headers: { cookie: 'kantim_access=not-a-token' },
    })

    expect(response.status).toBe(401)
  })

  it('accepts a signed-in session', async () => {
    const agent = await signUp(app)
    const response = await agent.get('/api/auth/me')

    expect(response.status).toBe(200)
    expect(response.body.user.email).toContain('@example.com')
  })

  it('answers an unknown API route with the app\'s own not-found message', async () => {
    const agent = await signUp(app)
    const response = await agent.get('/api/no-such-route')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      message: 'Not found.',
      statusCode: 404,
    })
  })
})
