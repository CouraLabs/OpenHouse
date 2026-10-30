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
import { toast } from '@workspace/ui/components/toast'
import i18next from 'i18next'

const TRANSACTIONS_KEY = ['transactions'] as const

const ACCOUNTS_KEY = ['accounts'] as const

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
      toast.add({ title: i18next.t('transactions.toast-saved') })
    },
  })
}

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
      toast.add({ title: i18next.t('transactions.toast-deleted') })
    },
  })
}

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
      toast.add({ title: i18next.t('transactions.toast-transferred') })
    },
  })
}

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
      toast.add({ title: i18next.t('transactions.toast-status-updated') })
    },
  })
}

export function useActiveAccounts() {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, 'active'],
    queryFn: ({ signal }) => api<AccountRef[]>('/accounts', { signal }),
  })
}

export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}

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

export function useInstallmentActions() {
  const queryClient = useQueryClient()
  const onSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
    void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
    void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    toast.add({ title: i18next.t('transactions.toast-installments-updated') })
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
