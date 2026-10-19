import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { createHash } from 'node:crypto'
import { JWT_TTLS, type JwtTtls } from './jwt-ttls.js'

/**
 * The claims an access token carries. Deliberately only the user id: the
 * tenant a request acts on comes from the user the session was issued to,
 * which the guard re-reads from the database on every request, never from the
 * token.
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
}

/** The hash format the user row stores for the current refresh token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Signs and verifies the two JWTs of a session. The secret is the one
 * `AuthModule` registered `JwtModule` with; the lifetimes are injected.
 *
 * Both kinds share a secret, so each carries a `typ` claim and each verifier
 * accepts only its own kind: a refresh token presented as an access token —
 * which would outlive a sign-out, since the guard never consults the stored
 * refresh hash — is rejected.
 */
@Injectable()
export class TokenService {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(JWT_TTLS) private readonly ttls: JwtTtls
  ) {}

  /** Signs the access token a guarded request presents. */
  signAccessToken(userId: number): string {
    const claims: AccessTokenClaims = { sub: String(userId), typ: 'access' }

    return this.jwt.sign(claims, { expiresIn: this.ttls.accessTtlS })
  }

  /**
   * Signs the refresh token of a new session, with its own id. A remembered
   * session's token lives as long as its cookie does.
   */
  signRefreshToken(
    userId: number,
    rememberMe: boolean
  ): { token: string; jti: string } {
    const jti = crypto.randomUUID()
    const claims: RefreshTokenClaims = {
      sub: String(userId),
      typ: 'refresh',
      jti,
      rem: rememberMe,
    }

    return {
      token: this.jwt.sign(claims, {
        expiresIn: rememberMe
          ? this.ttls.rememberRefreshTtlS
          : this.ttls.refreshTtlS,
      }),
      jti,
    }
  }

  /** Verifies an access token, returning its claims or `null`. */
  verifyAccessToken(token: string): AccessTokenClaims | null {
    const claims = this.verify(token)

    if (claims === null || typeof claims.sub !== 'string') {
      return null
    }

    return claims.typ === 'access' ? { sub: claims.sub, typ: 'access' } : null
  }

  /** Verifies a refresh token, returning its claims or `null`. */
  verifyRefreshToken(token: string): RefreshTokenClaims | null {
    const claims = this.verify(token)

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

  /** Verifies either kind of token, hiding the reason a bad one failed. */
  private verify(token: string): UnverifiedClaims | null {
    try {
      return this.jwt.verify<UnverifiedClaims>(token)
    } catch {
      return null
    }
  }
}
