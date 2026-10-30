import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type {
  ChangePasswordBody,
  ResendVerificationBody,
  ResetPasswordBody,
  SessionResponse,
  SignInBody,
  SignUpBody,
  SignUpResponse,
  VerifyEmailBody,
} from '@workspace/poco'
import { isSignUpAccepted } from '@workspace/poco'
import { ApiError, api } from './api.js'
import { SESSION_QUERY_KEY } from './query.js'

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
    staleTime: 60_000,
    retry: 3,
    retryOnMount: true,
  })
}

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

export function useSignUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SignUpBody) =>
      api<SignUpResponse>('/auth/sign-up', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (response) => {
      if (!isSignUpAccepted(response)) {
        queryClient.setQueryData(SESSION_QUERY_KEY, response)
      }
    },
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: VerifyEmailBody) =>
      api<SessionResponse>('/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (input: ResendVerificationBody) =>
      api<null>('/auth/email/resend', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}

export function useRefresh() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api<SessionResponse>('/auth/refresh', { method: 'POST' }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

export function useChangePassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ChangePasswordBody) =>
      api<SessionResponse>('/auth/password/change', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

export function useResetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ResetPasswordBody) =>
      api<SessionResponse>('/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (session) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, session)
    },
  })
}

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
