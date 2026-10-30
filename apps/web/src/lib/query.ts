import { QueryClient } from '@tanstack/react-query'
import type { SessionResponse } from '@workspace/poco'

export const SESSION_QUERY_KEY = ['session'] as const

export const queryClient = new QueryClient()

export function currentSession(): SessionResponse | null {
  return (
    queryClient.getQueryData<SessionResponse | null>(SESSION_QUERY_KEY) ?? null
  )
}
