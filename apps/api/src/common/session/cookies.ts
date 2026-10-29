/**
 * The session cookies: their names and the options every cookie of the
 * session shares. The tokens never touch a response body — they ride in
 * httpOnly cookies, so scripts on the page cannot read them.
 */

/** The cookie holding the access token. Read by the auth middleware. */
export const ACCESS_COOKIE = 'openhouse_access'

/** The cookie holding the refresh token. Read by the refresh route only. */
export const REFRESH_COOKIE = 'openhouse_refresh'

/** The base cookie options every cookie of the session shares. `secure`
 * rides the request's own protocol: the deployed app serves https, and
 * `wrangler dev` serves http://localhost, where a Secure cookie would not
 * be stored by every browser. */
export function baseCookieOptions(requestUrl: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: requestUrl.startsWith('https://'),
    path: '/',
  }
}
