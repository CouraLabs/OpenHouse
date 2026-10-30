import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Account } from '@workspace/poco'
import { IMPORT_MAX_BYTES, importFileExtensions } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'

import { ImportStepActions } from './import-step-actions.js'
import { RecentImports } from './recent-imports.js'

function hasImportExtension(name: string): boolean {
  const lower = name.toLowerCase()

  return importFileExtensions.some((extension) => lower.endsWith(extension))
}

export function ImportUploadStep({
  account,
  isReading,
  error,
  onSubmit,
  onCancel,
}: {
  account: Account
  isReading: boolean
  error: string | undefined
  onSubmit: (file: File) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)

  const problem =
    file === null
      ? undefined
      : !hasImportExtension(file.name)
        ? t('imports.file-type')
        : file.size > IMPORT_MAX_BYTES
          ? t('imports.file-too-large')
          : undefined

  return (
    <div className="flex flex-col gap-6">
      <Field data-invalid={problem !== undefined}>
        <FieldLabel htmlFor="import-file">
          {t('imports.file')}
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        </FieldLabel>
        <Input
          id="import-file"
          type="file"
          accept={importFileExtensions.join(',')}
          aria-invalid={problem !== undefined}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <FieldDescription>{t('imports.file-hint')}</FieldDescription>
        {problem !== undefined ? <FieldError>{problem}</FieldError> : null}
      </Field>
      {error !== undefined ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <RecentImports accountId={account.id} />
      <ImportStepActions>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('imports.cancel')}
        </Button>
        <Button
          type="button"
          disabled={file === null || problem !== undefined || isReading}
          onClick={() => file !== null && onSubmit(file)}
        >
          {isReading ? t('imports.reading') : t('imports.continue')}
        </Button>
      </ImportStepActions>
    </div>
  )
}
