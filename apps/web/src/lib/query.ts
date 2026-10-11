import { QueryClient } from '@tanstack/react-query'
import type { SessionResponse } from '@workspace/poco'

import { SESSION_QUERY_KEY } from './auth.js'

/** The query client every query and mutation of the app shares. */
export const queryClient = new QueryClient()

/**
 * The session the cache currently holds, or `null` while it holds none. The
 * route guards read this instead of a snapshot handed over at navigation
 * time: a sign-in updates the cache and navigates in the same tick, and the
 * guard must see the cache of that tick, not the props of the last render.
 */
export function currentSession(): SessionResponse | null {
  return queryClient.getQueryData<SessionResponse | null>(SESSION_QUERY_KEY) ?? null
}
