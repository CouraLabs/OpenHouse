/**
 * How long the tokens live, in seconds: an access token always, and a
 * refresh token for a session that did not (`refreshTtlS`) or did
 * (`rememberRefreshTtlS`) ask to be remembered.
 */
export interface JwtTtls {
  accessTtlS: number
  refreshTtlS: number
  rememberRefreshTtlS: number
}

/**
 * The injection token `AuthModule` provides the validated lifetimes under,
 * so the session code receives them instead of reading the environment.
 */
export const JWT_TTLS = Symbol('JWT_TTLS')
