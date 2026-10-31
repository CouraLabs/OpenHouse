import { QueryClient } from '@tanstack/react-query'
import type { SessionResponse } from '@workspace/dto'

export const SESSION_QUERY_KEY = ['session'] as const

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status

        if (status !== undefined && status >= 400 && status < 500) {
          return false
        }

        return failureCount < MAX_RETRIES
      },
    },
  },
})

export function currentSession(): SessionResponse | null {
  return (
    queryClient.getQueryData<SessionResponse | null>(SESSION_QUERY_KEY) ?? null
  )
}
