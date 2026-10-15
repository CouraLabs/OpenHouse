import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  Category,
  CreateCategoryBody,
  PagedResults,
  SearchCategoriesArgs,
  UpdateCategoryBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every category query and mutation lives under. */
const CATEGORIES_KEY = ['categories'] as const

/**
 * The page of categories a search describes. The args are the query key —
 * every distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
export function useCategoriesSearch(args: SearchCategoriesArgs) {
  return useQuery({
    queryKey: [...CATEGORIES_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Category>>('/categories/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** Saves a category: creates when the body has no id, updates when it has. */
export function useSaveCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateCategoryBody | UpdateCategoryBody) =>
      'id' in body
        ? api<Category>('/categories', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<Category>('/categories', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}

/** Soft-deletes a category: the API marks it DELETED. */
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY })
    },
  })
}
