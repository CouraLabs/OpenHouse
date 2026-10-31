import type { Context } from 'hono'

import type { AppEnv } from './context.js'

export function renderError(
  context: Context<AppEnv>,
  payload: unknown,
  status: 400 | 401 | 403 | 404 | 409 | 429
): Response {
  if (typeof payload === 'string') {
    return context.json(
      { message: payload, error: statusText(status), statusCode: status },
      status
    )
  }

  return context.json(payload as Record<string, unknown>, status)
}

function statusText(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request'
    case 401:
      return 'Unauthorized'
    case 403:
      return 'Forbidden'
    case 404:
      return 'Not Found'
    case 409:
      return 'Conflict'
    case 429:
      return 'Too Many Requests'
    default:
      return 'Error'
  }
}
