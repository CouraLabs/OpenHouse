import { describe, expect, it } from 'vitest'

import { signHs256, TokenService, verifyHs256 } from './token.service.js'

const service = () =>
  new TokenService('spec-secret', {
    accessTtlS: 900,
    refreshTtlS: 86_400,
    rememberRefreshTtlS: 2_592_000,
  })

const lifetimeS = async (token: string): Promise<number> => {
  const { iat, exp } = (await verifyHs256(token, 'spec-secret')) as {
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
    const foreign = await signHs256({ sub: '7', typ: 'access' }, 'other')

    expect(await service().verifyAccessToken(foreign)).toBeNull()
  })
})
