import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  AccountRef,
  CreateGoalBody,
  Goal,
  PagedResults,
  SearchGoalsArgs,
  UpdateGoalBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

const GOALS_KEY = ['goals'] as const

const ACTIVE_ACCOUNTS_KEY = ['accounts', 'active'] as const

export function useGoalsSearch(args: SearchGoalsArgs) {
  return useQuery({
    queryKey: [...GOALS_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Goal>>('/goals/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useSaveGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateGoalBody | UpdateGoalBody) =>
      'id' in body
        ? api<Goal>('/goals', { method: 'PUT', body: JSON.stringify(body) })
        : api<Goal>('/goals', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY })
    },
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api<void>(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY })
    },
  })
}

export function useActiveAccounts() {
  return useQuery({
    queryKey: [...ACTIVE_ACCOUNTS_KEY],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}
