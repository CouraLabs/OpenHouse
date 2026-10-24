import type { StartPage } from './preferences.js'
import type { TenantSettings } from './settings.js'

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
  /** The page the user opens on after signing in. */
  startPage: StartPage
  createdAt: string
  updatedAt: string
}

/** The tenant a session acts on, as the wire carries it. */
export interface SessionTenant {
  id: number
  name: string
  expiresIn: string | null
  /** The `YYYY-MM-DD` day (the tenant's calendar) the tenant and all its
   * data are hard-deleted, or nothing while no deletion is scheduled. */
  deletionDate: string | null
  createdAt: string
  updatedAt: string
}

/** The response body of the routes that establish a session. The tenant's
 * settings ride along, so the web app has them at boot. */
export interface SessionResponse {
  user: SessionUser
  tenant: SessionTenant
  settings: TenantSettings
}
