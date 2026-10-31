import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  Account,
  CategoryRef,
  ImportBatch,
  ImportCommitBody,
  ImportDelimiter,
  ImportEncoding,
  ImportMapping,
  ImportPreview,
  ImportResult,
  ImportUndoResult,
  ReceiverRef,
} from '@workspace/dto'

import { api } from '@/lib/api.js'
import { STATEMENTS_KEY } from '@/lib/statements.js'

const IMPORT_TIMEOUT_MS = 120_000

const IMPORTS_KEY = ['statement-imports'] as const

export interface PreviewRequest {
  accountId: number
  file: File
  mapping?: ImportMapping
  encoding?: ImportEncoding
  delimiter?: ImportDelimiter
  remap?: boolean
}

export function useImportPreview() {
  return useMutation({
    mutationFn: ({
      accountId,
      file,
      mapping,
      encoding,
      delimiter,
      remap,
    }: PreviewRequest) => {
      const form = new FormData()

      form.set('accountId', String(accountId))
      form.set('file', file)

      if (mapping !== undefined) {
        form.set('mapping', JSON.stringify(mapping))
      }

      if (encoding !== undefined) {
        form.set('encoding', encoding)
      }

      if (delimiter !== undefined) {
        form.set('delimiter', delimiter)
      }

      if (remap === true) {
        form.set('remap', 'true')
      }

      return api<ImportPreview>('/imports/preview', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
      })
    },
  })
}

export function useImportCommit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: ImportCommitBody) =>
      api<ImportResult>('/imports/commit', {
        method: 'POST',
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
      }),
    onSuccess: () => refreshLedger(queryClient),
  })
}

export function useImportUndo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (batchId: string) =>
      api<ImportUndoResult>(`/imports/batches/${batchId}/undo`, {
        method: 'POST',
        signal: AbortSignal.timeout(IMPORT_TIMEOUT_MS),
      }),
    onSuccess: () => refreshLedger(queryClient),
  })
}

export function useRecentImports(accountId: number) {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'recent', accountId],
    queryFn: ({ signal }) =>
      api<ImportBatch[]>(`/imports/recent?accountId=${accountId}`, { signal }),
  })
}

function refreshLedger(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: IMPORTS_KEY })
  void queryClient.invalidateQueries({ queryKey: ['accounts'] })
  void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
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

export function useImportAccount(accountId: number) {
  return useQuery({
    queryKey: ['accounts', accountId],
    queryFn: ({ signal }) => api<Account>(`/accounts/${accountId}`, { signal }),
  })
}
