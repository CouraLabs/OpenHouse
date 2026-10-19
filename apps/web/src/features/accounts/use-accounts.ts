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

/** The key every account query and mutation lives under. */
const ACCOUNTS_KEY = ['accounts'] as const

/**
 * The page of accounts a search describes. The args are the query key —
 * every distinct page, sort and filter is its own cache entry, and
 * `keepPreviousData` keeps the previous page on screen while the next loads.
 */
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

/** Saves an account: creates when the body has no id, updates when it has.
 * A card's new close or due days re-place its open charges on new bills,
 * so the transactions and the bills invalidate too. */
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

/** Soft-deletes an account: the API marks it DELETED. A card that still
 * owes on its bills answers 409 with an `AccountDeleteConflict` until the
 * call confirms it. */
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
