import { describe, expect, it } from 'vitest'

import { signIn, signUp, startApp, uniqueEmail } from './support.js'

describe('several sessions per user (e2e, #21)', () => {
  const { app } = startApp()

  it('keeps both devices signed in on Pro, and sign-out closes only one', async () => {
    const email = uniqueEmail()
    const first = await signUp(app, email, 'password-a', 2)
    const second = await signIn(app, email)

    expect((await first.post('/api/auth/refresh')).status).toBe(200)
    expect((await second.post('/api/auth/refresh')).status).toBe(200)

    expect((await first.post('/api/auth/sign-out')).status).toBe(200)

    expect((await first.post('/api/auth/refresh')).status).toBe(401)
    expect((await second.post('/api/auth/refresh')).status).toBe(200)
    expect((await second.get('/api/auth/me')).status).toBe(200)
  })

  it.each([-1, 3])('allows several sessions on tier %i', async (tier) => {
    const email = uniqueEmail()
    const first = await signUp(app, email, 'password-a', tier)
    const second = await signIn(app, email)

    expect((await first.post('/api/auth/refresh')).status).toBe(200)
    expect((await second.post('/api/auth/refresh')).status).toBe(200)
  })

  it.each([0, 1])(
    'signs the older device out on tier %i when another signs in',
    async (tier) => {
      const email = uniqueEmail()
      const first = await signUp(app, email, 'password-a', tier)
      const second = await signIn(app, email)

      expect((await second.post('/api/auth/refresh')).status).toBe(200)
      expect((await first.post('/api/auth/refresh')).status).toBe(401)
    }
  )

  it('signs every other session out when the password changes', async () => {
    const email = uniqueEmail()
    const first = await signUp(app, email, 'password-a', 2)
    const second = await signIn(app, email)

    const changed = await first.post('/api/auth/password/change', {
      currentPassword: 'password-a',
      newPassword: 'password-b',
    })

    expect(changed.status).toBe(200)
    expect((await second.post('/api/auth/refresh')).status).toBe(401)
    expect((await first.post('/api/auth/refresh')).status).toBe(200)
  })
})
