import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { CategoryRef, CreateTransactionLinkerBody, PagedResults, ReceiverRef, SearchTransactionLinkersArgs, TransactionLinker, UpdateTransactionLinkerBody } from '@workspace/dto'

import { api } from '@/lib/api.js'

const LINKERS_KEY = ['transaction-linkers'] as const

const ACTIVE_CATEGORIES_KEY = ['categories', 'active'] as const

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

export function useSaveLinker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (
      body: CreateTransactionLinkerBody | UpdateTransactionLinkerBody
    ) =>
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

export function useActiveCategories() {
  return useQuery({
    queryKey: [...ACTIVE_CATEGORIES_KEY],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}
