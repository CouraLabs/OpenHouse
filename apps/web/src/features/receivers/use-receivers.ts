import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CreateReceiverBody,
  PagedResults,
  Receiver,
  ReceiverRef,
  SearchReceiversArgs,
  UpdateReceiverBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'

/** The key every receiver query and mutation lives under. */
const RECEIVERS_KEY = ['receivers'] as const

/**
 * The page of receivers a search describes. The args are the query key —
 * every distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
export function useReceiversSearch(args: SearchReceiversArgs) {
  return useQuery({
    queryKey: [...RECEIVERS_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Receiver>>('/receivers/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** Saves a receiver: creates when the body has no id, updates when it has. */
export function useSaveReceiver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateReceiverBody | UpdateReceiverBody) =>
      'id' in body
        ? api<Receiver>('/receivers', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<Receiver>('/receivers', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECEIVERS_KEY })
    },
  })
}

/** Soft-deletes a receiver: the API marks it DELETED. */
export function useDeleteReceiver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/receivers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: RECEIVERS_KEY })
    },
  })
}

/** The tenant's ACTIVE receivers, by name — what pickers offer. */
export function useActiveReceivers() {
  return useQuery({
    queryKey: [...RECEIVERS_KEY, 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}
