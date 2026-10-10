import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash } from 'node:crypto'
import { getJwtSecret, getJwtTtls } from '../config/env.js'

/**
 * The claims an access token carries. Deliberately only the user id: the
 * tenant a request acts on comes from the user the session was issued to,
 * which the guard re-reads from the database on every request, never from the
 * token.
 */
export interface AccessTokenClaims {
  sub: string
}

/**
 * The claims a refresh token carries. The `jti` is matched against the hash
 * stored on the user row, so only the refresh token the session was issued
 * with is accepted and reuse of a rotated one is detectable.
 */
export interface RefreshTokenClaims {
  sub: string
  jti: string
}

/** The hash format the user row stores for the current refresh token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Signs and verifies the two JWTs of a session. Secret and lifetimes come
 * from the environment through getters rather than module options, so the
 * values are the validated ones and no factory wiring is needed.
 */
@Injectable()
export class TokenService {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  /** Signs the access token a guarded request presents. */
  signAccessToken(userId: number): string {
    const claims: AccessTokenClaims = { sub: String(userId) }

    return this.jwt.sign(claims, {
      secret: getJwtSecret(),
      expiresIn: getJwtTtls().accessTtlS,
    })
  }

  /** Signs the refresh token of a new session, with its own id. */
  signRefreshToken(userId: number): { token: string; jti: string } {
    const jti = crypto.randomUUID()
    const claims: RefreshTokenClaims = { sub: String(userId), jti }

    return {
      token: this.jwt.sign(claims, {
        secret: getJwtSecret(),
        expiresIn: getJwtTtls().refreshTtlS,
      }),
      jti,
    }
  }

  /** Verifies an access token, returning its claims or `null`. */
  verifyAccessToken(token: string): AccessTokenClaims | null {
    return this.verify<AccessTokenClaims>(token)
  }

  /** Verifies a refresh token, returning its claims or `null`. */
  verifyRefreshToken(token: string): RefreshTokenClaims | null {
    return this.verify<RefreshTokenClaims>(token)
  }

  /** Verifies either kind of token, hiding the reason a bad one failed. */
  private verify<T extends AccessTokenClaims | RefreshTokenClaims>(
    token: string
  ): T | null {
    try {
      const claims = this.jwt.verify<T>(token, { secret: getJwtSecret() })

      return typeof claims.sub === 'string' ? claims : null
    } catch {
      return null
    }
  }
}
