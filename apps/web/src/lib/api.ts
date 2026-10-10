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
 * Calls the API. Cookies ride along automatically (`credentials: 'include'`)
 * — the JWTs never leave the cookie jar, so no page code ever touches a
 * token. Requests time out after 10 seconds: a hung API must fail fast, or
 * the session gate holds the whole app hostage on a blank screen.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: init?.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { message?: string; issues?: ApiError['issues'] }
      | null

    throw new ApiError(
      response.status,
      body?.message ?? `The request failed with ${response.status}.`,
      body?.issues
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
