import { JwtService } from '@nestjs/jwt'
import { describe, expect, it } from 'vitest'

import { TokenService } from './token.service.js'

/** A token service over a real signer, with distinguishable lifetimes. */
const service = () =>
  new TokenService(new JwtService({ secret: 'spec-secret' }), {
    accessTtlS: 900,
    refreshTtlS: 86_400,
    rememberRefreshTtlS: 2_592_000,
  })

/** The seconds between a token's issue and its expiry. */
const lifetimeS = (token: string): number => {
  const { iat, exp } = new JwtService().decode<{ iat: number; exp: number }>(
    token
  )

  return exp - iat
}

describe('TokenService', () => {
  it('verifies each kind of token only as its own kind', () => {
    const tokens = service()
    const access = tokens.signAccessToken(7)
    const { token: refresh } = tokens.signRefreshToken(7, false)

    expect(tokens.verifyAccessToken(access)).toEqual({
      sub: '7',
      typ: 'access',
    })
    expect(tokens.verifyRefreshToken(access)).toBeNull()

    // A refresh token is not a credential for a guarded route: it would
    // outlive a sign-out, which only clears the stored refresh hash.
    expect(tokens.verifyAccessToken(refresh)).toBeNull()
    expect(tokens.verifyRefreshToken(refresh)).toMatchObject({
      sub: '7',
      typ: 'refresh',
      rem: false,
    })
  })

  it('gives a remembered session the remembered lifetime', () => {
    const tokens = service()
    const remembered = tokens.signRefreshToken(7, true).token
    const plain = tokens.signRefreshToken(7, false).token

    expect(lifetimeS(remembered)).toBe(2_592_000)
    expect(tokens.verifyRefreshToken(remembered)?.rem).toBe(true)
    expect(lifetimeS(plain)).toBe(86_400)
  })

  it('rejects a token signed with another secret', () => {
    const foreign = new JwtService({ secret: 'other' }).sign({
      sub: '7',
      typ: 'access',
    })

    expect(service().verifyAccessToken(foreign)).toBeNull()
  })
})
