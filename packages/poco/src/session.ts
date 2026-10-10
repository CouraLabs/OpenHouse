/**
 * The session the API answers `/auth/*` with and the web app lives in. These
 * are the wire shapes: dates cross HTTP as ISO strings, so every date is a
 * string here — the API maps its `Date` fields onto these before responding.
 */

/** The user of a session, as the wire carries it — secrets never included. */
export interface SessionUser {
  id: number
  tenantId: number
  email: string
  name: string
  role: 'owner' | 'user'
  createdAt: string
  updatedAt: string
}

/** The tenant a session acts on, as the wire carries it. */
export interface SessionTenant {
  id: number
  name: string
  expiresIn: string | null
  createdAt: string
  updatedAt: string
}

/** The response body of the routes that establish a session. */
export interface SessionResponse {
  user: SessionUser
  tenant: SessionTenant
}
