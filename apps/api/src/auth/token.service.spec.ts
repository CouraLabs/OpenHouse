import { describe, expect, it } from 'vitest'
import { sign, verify } from 'hono/jwt'

import { TokenService } from './token.service.js'

/** A token service over a real signer, with distinguishable lifetimes. */
const service = () =>
  new TokenService('spec-secret', {
    accessTtlS: 900,
    refreshTtlS: 86_400,
    rememberRefreshTtlS: 2_592_000,
  })

/** The seconds between a token's issue and its expiry. */
const lifetimeS = async (token: string): Promise<number> => {
  const { iat, exp } = (await verify(token, 'spec-secret', 'HS256')) as {
    iat: number
    exp: number
  }

  return exp - iat
}

describe('TokenService', () => {
  it('verifies each kind of token only as its own kind', async () => {
    const tokens = service()
    const access = await tokens.signAccessToken(7)
    const { token: refresh } = await tokens.signRefreshToken(7, false)

    expect(await tokens.verifyAccessToken(access)).toEqual({
      sub: '7',
      typ: 'access',
    })
    expect(await tokens.verifyRefreshToken(access)).toBeNull()

    // A refresh token is not a credential for a guarded route: it would
    // outlive a sign-out, which only clears the stored refresh hash.
    expect(await tokens.verifyAccessToken(refresh)).toBeNull()
    expect(await tokens.verifyRefreshToken(refresh)).toMatchObject({
      sub: '7',
      typ: 'refresh',
      rem: false,
    })
  })

  it('gives a remembered session the remembered lifetime', async () => {
    const tokens = service()
    const remembered = (await tokens.signRefreshToken(7, true)).token
    const plain = (await tokens.signRefreshToken(7, false)).token

    expect(await lifetimeS(remembered)).toBe(2_592_000)
    expect((await tokens.verifyRefreshToken(remembered))?.rem).toBe(true)
    expect(await lifetimeS(plain)).toBe(86_400)
  })

  it('rejects a token signed with another secret', async () => {
    const foreign = await sign({ sub: '7', typ: 'access' }, 'other', 'HS256')

    expect(await service().verifyAccessToken(foreign)).toBeNull()
  })
})
