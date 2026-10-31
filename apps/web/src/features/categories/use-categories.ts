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
} from '@workspace/dto'

import { api } from '@/lib/api.js'

const CATEGORIES_KEY = ['categories'] as const

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
