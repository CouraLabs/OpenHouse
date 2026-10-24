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
} from '@workspace/poco'

import { api } from '@/lib/api.js'
import { STATEMENTS_KEY } from '@/lib/statements.js'

/** Reading a 5 MB file and writing 5,000 rows in one transaction take far
 * longer than an ordinary request: these calls wait up to two minutes. */
const IMPORT_TIMEOUT_MS = 120_000

/** The key the recent-batches list lives under. */
const IMPORTS_KEY = ['statement-imports'] as const

/** What a preview asks for: the file and how to read it. */
export interface PreviewRequest {
  accountId: number
  file: File
  /** The CSV mapping to read the file with; without one, the account's
   * saved mapping applies. */
  mapping?: ImportMapping
  /** Reads the CSV bytes as this encoding while it has no mapping yet. */
  encoding?: ImportEncoding
  delimiter?: ImportDelimiter
  /** Ignores the saved mapping and answers the mapping step instead. */
  remap?: boolean
}

/** Uploads a file and answers its preview. Nothing is written. */
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

/** Commits the picked rows. It moves balances and writes transactions, so
 * the accounts, transactions, and bills refresh. */
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

/** Undoes a whole batch: its rows are soft-deleted and their balance
 * reverted. */
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

/** The account's imports from the last 24 hours that can still be undone. */
export function useRecentImports(accountId: number) {
  return useQuery({
    queryKey: [...IMPORTS_KEY, 'recent', accountId],
    queryFn: ({ signal }) =>
      api<ImportBatch[]>(`/imports/recent?accountId=${accountId}`, { signal }),
  })
}

/** Refreshes everything an import or its undo changes. */
function refreshLedger(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: IMPORTS_KEY })
  void queryClient.invalidateQueries({ queryKey: ['accounts'] })
  void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  void queryClient.invalidateQueries({ queryKey: STATEMENTS_KEY })
}

/** The tenant's ACTIVE categories, by name — what the preview's pickers offer. */
export function useActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active'],
    queryFn: ({ signal }) => api<CategoryRef[]>('/categories', { signal }),
  })
}

/** The tenant's ACTIVE receivers, by name — what the preview's pickers offer. */
export function useActiveReceivers() {
  return useQuery({
    queryKey: ['receivers', 'active'],
    queryFn: ({ signal }) => api<ReceiverRef[]>('/receivers', { signal }),
  })
}

/** One account of the tenant, for the page the import opens on. */
export function useImportAccount(accountId: number) {
  return useQuery({
    queryKey: ['accounts', accountId],
    queryFn: ({ signal }) => api<Account>(`/accounts/${accountId}`, { signal }),
  })
}
