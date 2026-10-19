import type { Session } from './session.js'

/**
 * Turns the access token a request presents into the session it acts as, or
 * `null` when the token does not stand for a usable session. Abstract so the
 * guard stays infrastructure: what a token is and how a user and tenant are
 * read belong to `auth/`, which provides the implementation.
 */
export abstract class SessionResolver {
  abstract resolve(accessToken: string): Promise<Session | null>
}
