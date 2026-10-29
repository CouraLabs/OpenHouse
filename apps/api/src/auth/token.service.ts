import { sign, verify } from 'hono/jwt'

import type { JwtTtls } from '../config/env.js'

/**
 * The claims an access token carries. Deliberately only the user id: the
 * tenant a request acts on comes from the user the session was issued to,
 * which the auth middleware re-reads from the database on every request,
 * never from the token.
 */
export interface AccessTokenClaims {
  sub: string
  typ: 'access'
}

/**
 * The claims a refresh token carries. The `jti` is matched against the hash
 * stored on the user row, so only the refresh token the session was issued
 * with is accepted and reuse of a rotated one is detectable. `rem` records
 * whether the sign-in asked to be remembered, so every refresh keeps the
 * lifetime the session started with.
 */
export interface RefreshTokenClaims {
  sub: string
  typ: 'refresh'
  jti: string
  rem: boolean
}

/** A verified token's payload before its shape is checked. */
interface UnverifiedClaims {
  sub?: unknown
  typ?: unknown
  jti?: unknown
  rem?: unknown
  exp?: unknown
}

/**
 * The SHA-256 hex of a token — the hash the user row stores for the current
 * refresh token, and the shape every other hash of the session stores.
 * WebCrypto, so it runs on Workers.
 */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(token)
  )

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Signs and verifies the two JWTs of a session, HS256 with the deployment's
 * secret. Both kinds share a secret, so each carries a `typ` claim and each
 * verifier accepts only its own kind: a refresh token presented as an
 * access token — which would outlive a sign-out, since the middleware never
 * consults the stored refresh hash — is rejected.
 *
 * The claims and the secret are the ones the previous implementation signed,
 * so tokens issued before the migration stay valid.
 */
export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly ttls: JwtTtls
  ) {}

  /** Signs the access token a guarded request presents. */
  async signAccessToken(userId: number): Promise<string> {
    const now = Math.floor(Date.now() / 1000)

    return sign(
      { sub: String(userId), typ: 'access', iat: now, exp: now + this.ttls.accessTtlS },
      this.secret,
      'HS256'
    )
  }

  /**
   * Signs the refresh token of a new session, with its own id. A remembered
   * session's token lives as long as its cookie does.
   */
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

  /** Verifies an access token, returning its claims or `null`. */
  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    const claims = await this.verify(token)

    if (claims === null || typeof claims.sub !== 'string') {
      return null
    }

    return claims.typ === 'access' ? { sub: claims.sub, typ: 'access' } : null
  }

  /** Verifies a refresh token, returning its claims or `null`. */
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

  /** Verifies either kind of token, or `null` when it does not verify. */
  private async verify(token: string): Promise<UnverifiedClaims | null> {
    try {
      const claims = (await verify(token, this.secret, 'HS256')) as UnverifiedClaims

      return claims
    } catch {
      return null
    }
  }
}
