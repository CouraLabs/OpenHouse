import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CategoryRef,
  CreateLimitBody,
  PagedResults,
  SearchLimitsArgs,
  UpdateLimitBody,
  Limit,
  LimitUsage,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every limit query and mutation lives under. */
const LIMITS_KEY = ['limits'] as const

/** The key the active-category list lives under — what the form's dropdown reads. */
const ACTIVE_CATEGORIES_KEY = ['categories', 'active'] as const

/**
 * The page of limits a search describes. The args are the query key —
 * every distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
export function useLimitsSearch(args: SearchLimitsArgs) {
  return useQuery({
    queryKey: [...LIMITS_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Limit>>('/limits/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** The usage view: every ACTIVE limit with what its period has spent
 * against it, totaled by the API — what the usage cards render. */
export function useLimitsUsage() {
  return useQuery({
    queryKey: [...LIMITS_KEY, 'usage'],
    queryFn: ({ signal }) => api<LimitUsage[]>('/limits/usage', { signal }),
  })
}

/** Saves a limit: creates when the body has no id, updates when it has. */
export function useSaveLimit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateLimitBody | UpdateLimitBody) =>
      'id' in body
        ? api<Limit>('/limits', { method: 'PUT', body: JSON.stringify(body) })
        : api<Limit>('/limits', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LIMITS_KEY })
    },
  })
}

/** Soft-deletes a limit: the API marks it DELETED. */
export function useDeleteLimit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/limits/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LIMITS_KEY })
    },
  })
}

/** The tenant's ACTIVE categories, by name — what the form's dropdown offers. */
export function useActiveCategories() {
  return useQuery({
    queryKey: [...ACTIVE_CATEGORIES_KEY],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}
