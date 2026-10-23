import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  AccountRef,
  CategoryRef,
  CreateTransactionBody,
  InstallmentDeleteScope,
  InstallmentGroup,
  InstallmentRefund,
  InstallmentsBody,
  PagedResults,
  ReceiverRef,
  SearchTransactionsArgs,
  Transaction,
  TransactionStatus,
  TransactionSummary,
  TransferBody,
  UpdateInstallmentGroupBody,
  UpdateTransactionBody,
} from '@workspace/poco'

import { api } from '@/lib/api.js'
import { STATEMENTS_KEY } from '@/lib/statements.js'

/** The key every transaction query and mutation lives under. */
const TRANSACTIONS_KEY = ['transactions'] as const

/** The key the account list lives under — transfers change balances, so
 * mutations invalidate it too. */
const ACCOUNTS_KEY = ['accounts'] as const

/**
 * The pages of transactions a search describes, loaded lazily as the grid
 * scrolls. The args minus the paging are the query key; each page is its
 * own cache entry.
 */
export function useTransactionsInfinite(args: SearchTransactionsArgs) {
  return useInfiniteQuery({
    queryKey: [...TRANSACTIONS_KEY, 'search', args],
    queryFn: ({ pageParam, signal }) =>
      api<PagedResults<Transaction>>('/transactions/search', {
        method: 'POST',
        body: JSON.stringify({ ...args, skip: pageParam }),
        signal,
      }),
    initialPageParam: 0,
    getNextPageParam: (last, allPages) => {
      // A page that answers nothing means the offset walked past rows that
      // vanished while paging — asking again would answer nothing again,
      // forever. Paging stops here; the next mutation's invalidation
      // refetches from the first page.
      if (last.items.length === 0) {
        return undefined
      }

      const loaded = allPages.reduce(
        (total, page) => total + page.items.length,
        0
      )

      return loaded < last.total ? loaded : undefined
    },
    placeholderData: keepPreviousData,
  })
}

/** Totals the transactions a filter describes, grouped by currency. */
export function useTransactionSummary(
  filter: SearchTransactionsArgs['filter']
) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'summary', filter],
    queryFn: ({ signal }) =>
      api<TransactionSummary>('/transactions/summary', {
        method: 'POST',
        body: JSON.stringify({ sort: [], filter }),
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** Saves a transaction: creates when the body has no id, updates when it
 * has. A save moves the account's balance, so the accounts invalidate too. */
export function useSaveTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: CreateTransactionBody | UpdateTransactionBody) =>
      'id' in body
        ? api<Transaction>('/transactions', {
            method: 'PUT',
            body: JSON.stringify(body),
          })
        : api<Transaction>('/transactions', {
            method: 'POST',
            body: JSON.stringify(body),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

/** Soft-deletes a transaction: the API reverts the account's balance. A row
 * on or before its account's `reconciledThrough` answers 409 until the call
 * confirms it. */
export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      confirmReconciled = false,
    }: {
      id: number
      confirmReconciled?: boolean
    }) =>
      api<void>(
        `/transactions/${id}${confirmReconciled ? '?confirmReconciled=true' : ''}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

/** Moves money between two accounts: the API creates the two sides. */
export function useTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: TransferBody) =>
      api<Transaction[]>('/transactions/transfer', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
  })
}

/**
 * Changes a transaction's review status alone. Deliberately leaves the
 * accounts alone: a review-status change never moves money — the API
 * writes no amount, account, or day. A bill's totals do follow it (a
 * Canceled charge stops counting), so the bills invalidate.
 */
export function useChangeTransactionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      status,
      confirmReconciled,
    }: {
      id: number
      status: TransactionStatus
      confirmReconciled?: boolean
    }) =>
      api<Transaction>(`/transactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ id, status, confirmReconciled }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
      void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    },
  })
}

/** The tenant's ACTIVE accounts, with type and currency — what the forms'
 * dropdowns and the transfer's currency check read. */
export function useActiveAccounts() {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}

/** The tenant's ACTIVE categories, by name — what the forms' dropdowns offer. */
export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

/** The tenant's ACTIVE receivers, by name — what the forms' dropdowns offer. */
export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}

/** One installment purchase: its installments, total, and editability.
 * Lives under the transactions key, so every mutation refreshes it. */
export function useInstallmentGroup(groupId: string | null) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, 'installments', groupId],
    queryFn: ({ signal }) =>
      api<InstallmentGroup>(`/transactions/installments/${groupId}`, {
        signal,
      }),
    enabled: groupId !== null,
  })
}

/**
 * The installment purchase writes: a group edit, a delete (`all` or the
 * `remaining` ones), a full refund, a collapse back into one row, and a
 * split of a single expense. Each moves the card's balance and its bills,
 * so all three keys invalidate.
 */
export function useInstallmentActions() {
  const queryClient = useQueryClient()
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
  }

  return {
    update: useMutation({
      mutationFn: ({
        groupId,
        ...body
      }: UpdateInstallmentGroupBody & { groupId: string }) =>
        api<InstallmentGroup>(`/transactions/installments/${groupId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: ({
        groupId,
        scope,
      }: {
        groupId: string
        scope: InstallmentDeleteScope
      }) =>
        api<void>(`/transactions/installments/${groupId}?scope=${scope}`, {
          method: 'DELETE',
        }),
      onSuccess,
    }),
    refund: useMutation({
      mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
        api<InstallmentRefund>(`/transactions/installments/${groupId}/refund`, {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),
      onSuccess,
    }),
    collapse: useMutation({
      mutationFn: (groupId: string) =>
        api<Transaction>(`/transactions/installments/${groupId}/collapse`, {
          method: 'POST',
        }),
      onSuccess,
    }),
    split: useMutation({
      mutationFn: ({ id, ...body }: InstallmentsBody & { id: number }) =>
        api<InstallmentGroup>(`/transactions/${id}/installments`, {
          method: 'POST',
          body: JSON.stringify(body),
        }),
      onSuccess,
    }),
  }
}
