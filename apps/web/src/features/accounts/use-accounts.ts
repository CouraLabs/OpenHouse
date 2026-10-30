import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  Account,
  CreateAccountBody,
  PagedResults,
  SearchAccountsArgs,
  UpdateAccountBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'
import { STATEMENTS_KEY } from '@/lib/statements.js'

const ACCOUNTS_KEY = ['accounts'] as const

export function useAccountsSearch(args: SearchAccountsArgs) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'search', args],
    queryFn: ({ signal }) =>
      api<PagedResults<Account>>('/accounts/search', {
        method: 'POST',
        body: JSON.stringify(args),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useSaveAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateAccountBody | UpdateAccountBody) =>
      'id' in body
        ? api<Account>('/accounts', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<Account>('/accounts', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ['transactions'] })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      confirmUnpaidBills = false,
    }: {
      id: number
      confirmUnpaidBills?: boolean
    }) =>
      api<void>(
        `/accounts/${id}${confirmUnpaidBills ? '?confirmUnpaidBills=true' : ''}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}
