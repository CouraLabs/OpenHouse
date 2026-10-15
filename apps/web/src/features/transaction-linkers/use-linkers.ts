import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CategoryRef,
  CreateTransactionLinkerBody,
  PagedResults,
  ReceiverRef,
  SearchTransactionLinkersArgs,
  TransactionLinker,
  UpdateTransactionLinkerBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every linker query and mutation lives under. */
const LINKERS_KEY = ['transaction-linkers'] as const

/** The key the active-category list lives under — what the form's dropdown reads. */
const ACTIVE_CATEGORIES_KEY = ['categories', 'active'] as const

/**
 * The page of linkers a search describes. The args are the query key —
 * every distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
export function useLinkersSearch(args: SearchTransactionLinkersArgs) {
  return useQuery({
    queryKey: [...LINKERS_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<TransactionLinker>>('/transaction-linkers/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** Saves a linker: creates when the body has no id, updates when it has. */
export function useSaveLinker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTransactionLinkerBody | UpdateTransactionLinkerBody) =>
      'id' in body
        ? api<TransactionLinker>('/transaction-linkers', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<TransactionLinker>('/transaction-linkers', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LINKERS_KEY })
    },
  })
}

/** Soft-deletes a linker: the API marks it DELETED. */
export function useDeleteLinker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/transaction-linkers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: LINKERS_KEY })
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

/** The tenant's ACTIVE receivers, by name — what the form's dropdown offers. */
export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) =>
      api<ReceiverRef[]>('/receivers', { signal }),
  })
}
