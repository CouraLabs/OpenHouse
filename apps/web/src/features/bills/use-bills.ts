import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { AccountRef, CategoryRef, PagedResults, SearchTransactionsArgs, Transaction, TransferBody } from '@workspace/dto'

import { api } from '@/lib/api.js'
import { STATEMENTS_KEY } from '@/lib/statements.js'

export function useActiveAccounts() {
  return useQuery({
    queryKey: ['accounts', 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}

export function useBillTransactions(args: SearchTransactionsArgs) {
  return useQuery({
    queryKey: ['transactions', 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Transaction>>('/transactions/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

export function usePayBill() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: TransferBody) =>
      api<Transaction[]>('/transactions/transfer', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['accounts'] })
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useMarkChecked() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      api<Transaction>(`/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ id, status: 'Checked' }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}
