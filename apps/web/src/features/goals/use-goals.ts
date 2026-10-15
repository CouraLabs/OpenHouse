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

/** The key every goal query and mutation lives under. */
const GOALS_KEY = ['goals'] as const

/** The key the active-account list lives under — what the form's dropdown reads. */
const ACTIVE_ACCOUNTS_KEY = ['accounts', 'active'] as const

/**
 * The page of goals a search describes. The args are the query key —
 * every distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
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

/** Saves a goal: creates when the body has no id, updates when it has. */
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

/** Soft-deletes a goal: the API marks it DELETED. */
export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => api<void>(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY })
    },
  })
}

/** The tenant's ACTIVE accounts, by name — what the form's dropdown offers.
 * The `type` rides along so the goals form can offer only Savings. */
export function useActiveAccounts() {
  return useQuery({
    queryKey: [...ACTIVE_ACCOUNTS_KEY],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}
