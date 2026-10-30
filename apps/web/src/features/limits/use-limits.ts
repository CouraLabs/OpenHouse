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

const LIMITS_KEY = ['limits'] as const

const ACTIVE_CATEGORIES_KEY = ['categories', 'active'] as const

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

export function useLimitsUsage() {
  return useQuery({
    queryKey: [...LIMITS_KEY, 'usage'],
    queryFn: ({ signal }) => api<LimitUsage[]>('/limits/usage', { signal }),
  })
}

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

export function useActiveCategories() {
  return useQuery({
    queryKey: [...ACTIVE_CATEGORIES_KEY],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}
