import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { SessionResponse, SignInBody, SignUpBody } from '@workspace/poco'
import { ApiError, api } from './api.js'
import { SESSION_QUERY_KEY } from './query.js'

/**
 * The session the current cookies resolve to, or `null` when they resolve to
 * none — a 401 from `/auth/me` is an answer, not a failure.
 */
export function useSession() {
  return useQuery<SessionResponse | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async ({ signal }) => {
      try {
        return await api<SessionResponse>('/auth/me', { signal })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null
        }

        throw error
      }
    },
    // The cookie does not expire because the tab is open; the server says
    // when the session is gone. A network failure still retries: on a page
    // reload with a momentarily unavailable API, a permanent blank screen is
    // the alternative.
    staleTime: 60_000,
    retry: 3,
    retryOnMount: true,
  })
}

/** Starts a session with existing credentials. */
export function useSignIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignInBody) =>
      api<SessionResponse>('/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

/** Starts a session by creating a tenant or joining one with a code. */
export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignUpBody) =>
      api<SessionResponse>('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

/** Exchanges the refresh cookie for a fresh pair and updates the session. */
export function useRefresh() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<SessionResponse>('/auth/refresh', { method: 'POST' }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

/** Ends the session server-side and drops it client-side. */
export function useSignOut() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => api<{ ok: true }>('/auth/sign-out', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      void navigate({ to: '/sign-in' })
    },
  })
}
