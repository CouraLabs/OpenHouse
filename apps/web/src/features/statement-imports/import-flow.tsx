import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  Account,
  ImportCommitRow,
  ImportMapping,
  ImportPreview,
  ImportResult,
  ReconciledEditConflict,
} from '@workspace/dto'

import { ApiError } from '@/lib/api.js'
import { ImportMappingStep } from './import-mapping-step.js'
import { ImportPreviewStep } from './import-preview-step.js'
import { ImportResultStep } from './import-result-step.js'
import { ImportUploadStep } from './import-upload-step.js'
import {
  useImportCommit,
  useImportPreview,
  type PreviewRequest,
} from './use-statement-imports.js'

type Stage = 'upload' | 'mapping' | 'preview' | 'result'

function reconciledConflictOf(error: unknown): ReconciledEditConflict | null {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'reconciledThrough' in error.body
  ) {
    return error.body as ReconciledEditConflict
  }

  return null
}

export function ImportFlow({
  account,
  onClose,
}: {
  account: Account
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [stage, setStage] = useState<Stage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const read = useImportPreview()
  const commit = useImportCommit()

  const readFile = (request: Omit<PreviewRequest, 'accountId'>) =>
    read.mutate(
      { accountId: account.id, ...request },
      {
        onSuccess: (data) => {
          setFile(request.file)
          setPreview(data)
          setStage(data.needsMapping ? 'mapping' : 'preview')
        },
      }
    )

  const submitRows = (rows: ImportCommitRow[], confirmReconciled: boolean) =>
    commit.mutate(
      {
        accountId: account.id,
        rows,
        mapping: preview?.format === 'csv' ? preview.mapping : null,
        confirmReconciled,
      },
      {
        onSuccess: (data) => {
          setResult(data)
          setStage('result')
        },
      }
    )

  const readError = read.isError
    ? read.error instanceof Error
      ? read.error.message
      : t('imports.error')
    : undefined
  const conflict = reconciledConflictOf(commit.error)
  const commitError =
    commit.isError && conflict === null
      ? commit.error instanceof Error
        ? commit.error.message
        : t('imports.error')
      : undefined

  if (stage === 'mapping' && file !== null && preview !== null) {
    return (
      <ImportMappingStep
        preview={preview}
        isReading={read.isPending}
        error={readError}
        onReencode={(encoding, delimiter) =>
          readFile({ file, encoding, delimiter, remap: true })
        }
        onSubmit={(mapping: ImportMapping) => readFile({ file, mapping })}
        onBack={() => setStage('upload')}
      />
    )
  }

  if (stage === 'preview' && file !== null && preview !== null) {
    return (
      <ImportPreviewStep
        account={account}
        preview={preview}
        isCommitting={commit.isPending}
        error={commitError}
        reconciledThrough={conflict?.reconciledThrough ?? null}
        onCommit={submitRows}
        onRemap={
          preview.format === 'csv'
            ? () => readFile({ file, remap: true })
            : undefined
        }
        isReading={read.isPending}
        onBack={() => {
          commit.reset()
          setStage('upload')
        }}
      />
    )
  }

  if (stage === 'result' && result !== null) {
    return (
      <ImportResultStep account={account} result={result} onDone={onClose} />
    )
  }

  return (
    <ImportUploadStep
      account={account}
      isReading={read.isPending}
      error={readError}
      onSubmit={(chosen) => readFile({ file: chosen })}
      onCancel={onClose}
    />
  )
}
