import { appPath, routePathname } from './app-url.js'
import { queryClient, SESSION_QUERY_KEY } from './query.js'

export class ApiError extends Error {
  readonly status: number
  readonly issues?: Array<{ path: string[]; message: string }>
  readonly body?: unknown

  constructor(
    status: number,
    message: string,
    issues?: ApiError['issues'],
    body?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
    this.body = body
  }
}

const REFRESHABLE_STATUSES = new Set([401])

const AUTH_PATHS = new Set([
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/refresh',
  '/auth/password/reset',
  '/auth/email/verify',
  '/auth/email/resend',
])

const PUBLIC_PATHS = new Set([
  '/sign-in',
  '/sign-up',
  '/reset-password',
  '/verify-email',
])

let refreshInFlight: Promise<boolean> | null = null

const REFRESH_LOCK = 'auth-refresh'

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= exchange().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

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

function endSession(): void {
  queryClient.setQueryData(SESSION_QUERY_KEY, null)

  if (!PUBLIC_PATHS.has(routePathname())) {
    window.location.assign(appPath('/sign-in'))
  }
}

function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  if (
    init?.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has('content-type')
  ) {
    headers.set('content-type', 'application/json')
  }

  return fetch(`/api${path}`, {
    credentials: 'include',
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(10_000),
  })
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()

  return (text === '' ? undefined : JSON.parse(text)) as T
}

async function toError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    message?: string
    issues?: ApiError['issues']
  } | null

  return new ApiError(
    response.status,
    body?.message ?? `The request failed with ${response.status}.`,
    body?.issues,
    body ?? undefined
  )
}

async function send(path: string, init?: RequestInit): Promise<Response> {
  const response = await request(path, init)

  if (response.ok) {
    return response
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
        return retried
      }

      throw await toError(retried)
    }

    endSession()
  }

  throw await toError(response)
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return parse<T>(await send(path, init))
}

export interface ApiFile {
  blob: Blob
  filename: string
}

export async function apiFile(
  path: string,
  init?: RequestInit,
  fallbackName = 'download'
): Promise<ApiFile> {
  const response = await send(path, {
    signal: AbortSignal.timeout(120_000),
    ...init,
  })
  const disposition = response.headers.get('content-disposition') ?? ''
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName

  return { blob: await response.blob(), filename }
}
