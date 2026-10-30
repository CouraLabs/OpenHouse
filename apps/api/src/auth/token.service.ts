import { sign, verify } from 'hono/jwt'

import type { JwtTtls } from '../config/env.js'

export interface AccessTokenClaims {
  sub: string
  typ: 'access'
}

export interface RefreshTokenClaims {
  sub: string
  typ: 'refresh'
  jti: string
  rem: boolean
}

interface UnverifiedClaims {
  sub?: unknown
  typ?: unknown
  jti?: unknown
  rem?: unknown
  exp?: unknown
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly ttls: JwtTtls
  ) {}

  async signAccessToken(userId: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    return sign(
      { sub: String(userId), typ: 'access', iat: now, exp: now + this.ttls.accessTtlS },
      this.secret,
      'HS256'
    )
  }

  async signRefreshToken(
    userId: number,
    rememberMe: boolean
  ): Promise<{ token: string; jti: string }> {
    const jti = crypto.randomUUID()
    const now = Math.floor(Date.now() / 1000)
    const lifetime = rememberMe
      ? this.ttls.rememberRefreshTtlS
      : this.ttls.refreshTtlS

    return {
      token: await sign(
        {
          sub: String(userId),
          typ: 'refresh',
          jti,
          rem: rememberMe,
          iat: now,
          exp: now + lifetime,
        },
        this.secret,
        'HS256'
      ),
      jti,
    }
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    const claims = await this.verify(token)

    if (claims === null || typeof claims.sub !== 'string') {
      return null
    }

    return claims.typ === 'access' ? { sub: claims.sub, typ: 'access' } : null
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    const claims = await this.verify(token)

    if (
      claims === null ||
      typeof claims.sub !== 'string' ||
      claims.typ !== 'refresh' ||
      typeof claims.jti !== 'string'
    ) {
      return null
    }

    return {
      sub: claims.sub,
      typ: 'refresh',
      jti: claims.jti,
      rem: claims.rem === true,
    }
  }

  private async verify(token: string): Promise<UnverifiedClaims | null> {
    try {
      const claims = (await verify(token, this.secret, 'HS256')) as UnverifiedClaims

      return claims
    } catch {
      return null
    }
  }
}
