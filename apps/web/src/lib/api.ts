import { queryClient, SESSION_QUERY_KEY } from './query.js'

/**
 * The error the API answers with. `message` is what a user reads; `issues`
 * is the field-level detail a validation rejection carries.
 */
export class ApiError extends Error {
  readonly status: number
  readonly issues?: Array<{ path: string[]; message: string }>

  constructor(status: number, message: string, issues?: ApiError['issues']) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}

/**
 * The statuses a stale session can answer with. 401 is an expired access
 * token — the only answer a stale session gives. 403 is deliberately out:
 * the guard answers it for role denial, which no refresh can fix, and
 * refreshing on it would rotate the cookies of a session that is about to
 * be denied anyway.
 */
const REFRESHABLE_STATUSES = new Set([401])

/**
 * The auth routes a refresh never replays: signing in or up while the
 * cookies are stale would loop, and `/auth/refresh` replaying itself would
 * too. `/auth/me` is deliberately not here — it is the first call of every
 * load, and its 401 is the exact case the refresh cookie exists for: the
 * access token expired while the page was closed, and the refresh replays
 * the bootstrap instead of bouncing the user to sign-in.
 */
const AUTH_PATHS = new Set(['/auth/sign-in', '/auth/sign-up', '/auth/refresh'])

/** The refresh attempt already in flight, so a burst of 401s shares one. */
let refreshInFlight: Promise<boolean> | null = null

/** The lock every tab of this origin refreshes under. The server revokes a
 * refresh token on reuse, so two tabs exchanging at the same instant would
 * revoke each other's session; cookies are shared per browser, so
 * serializing the exchange lets the second tab rotate the already-fresh
 * token harmlessly. */
const REFRESH_LOCK = 'auth-refresh'

/**
 * Exchanges the refresh cookie for a fresh pair. Every concurrent caller
 * in this tab awaits the same attempt; every tab of the browser awaits the
 * same lock. Resolves whether the API accepted the exchange; a network
 * failure rejects — the session is not over, the API just cannot be
 * reached, and the caller decides what that means.
 */
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= exchange().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

/** One refresh exchange, serialized across tabs where Web Locks exist. */
async function exchange(): Promise<boolean> {
  const attempt = async (): Promise<boolean> => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(10_000),
    })

    return response.ok
  }

  if (navigator.locks === undefined) {
    return attempt()
  }

  return navigator.locks.request(REFRESH_LOCK, attempt)
}

/**
 * Records that the session is over and sends the user to sign in. A reload
 * is deliberate: the session died, so every cached page, query and in-flight
 * mutation is stale and a fresh start clears them all at once.
 */
function endSession(): void {
  queryClient.setQueryData(SESSION_QUERY_KEY, null)

  if (window.location.pathname !== '/sign-in') {
    window.location.assign('/sign-in')
  }
}

/** Sends one request. Cookies ride along automatically
 * (`credentials: 'include'`) — the JWTs never leave the cookie jar, so no
 * page code ever touches a token. Requests time out after 10 seconds: a hung
 * API must fail fast, or the session gate holds the whole app hostage on a
 * blank screen. */
function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/api${path}`, {
    credentials: 'include',
    headers:
      init?.body !== undefined
        ? { 'content-type': 'application/json' }
        : undefined,
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  })
}

/** Unwraps a successful response: 204 answers with nothing. */
async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

/** Turns a failed response into the error the callers catch. */
async function toError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    message?: string
    issues?: ApiError['issues']
  } | null

  return new ApiError(
    response.status,
    body?.message ?? `The request failed with ${response.status}.`,
    body?.issues
  )
}

/**
 * Calls the API. When the API rejects the call with 401, the refresh cookie
 * gets one chance to renew the session before the failure is reported: the
 * request is replayed once against the fresh cookies. If the refresh is
 * refused too, the session is over — the cache is cleared and the user is
 * sent to the sign-in page. A refresh that never reaches a verdict (the
 * API unreachable, the request timing out) is not a refusal: the session
 * stands, and the failure surfaces as the error the callers catch.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await request(path, init)

  if (response.ok) {
    return parse<T>(response)
  }

  if (REFRESHABLE_STATUSES.has(response.status) && !AUTH_PATHS.has(path)) {
    let refreshed: boolean

    try {
      refreshed = await refreshSession()
    } catch {
      throw new ApiError(
        response.status,
        'The API could not be reached. Check the connection and try again.'
      )
    }

    if (refreshed) {
      const retried = await request(path, init)

      if (retried.ok) {
        return parse<T>(retried)
      }

      throw await toError(retried)
    }

    endSession()
  }

  throw await toError(response)
}
