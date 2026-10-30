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

const RECEIVERS_KEY = ['receivers'] as const

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

export function useActiveReceivers() {
  return useQuery({
    queryKey: [...RECEIVERS_KEY, 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}
