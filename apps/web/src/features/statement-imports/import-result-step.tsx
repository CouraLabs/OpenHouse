import { useTranslation } from 'react-i18next'
import type { Account, ImportResult } from '@workspace/poco'
import { Button } from '@workspace/ui/components/button'

import { ImportStepActions } from './import-step-actions.js'
import { useImportUndo } from './use-statement-imports.js'

/**
 * The last step: what the commit did — "42 imported, 3 skipped as
 * duplicates" — and, while the batch has rows, the way to undo it. After an
 * undo the line says so instead.
 */
export function ImportResultStep({
  account,
  result,
  onDone,
}: {
  account: Account
  result: ImportResult
  onDone: () => void
}) {
  const { t } = useTranslation()
  const undo = useImportUndo()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1" role="status">
        <p className="font-serif text-xl">
          {undo.isSuccess
            ? t('imports.undone', { count: undo.data.undone })
            : t('imports.result', {
                imported: result.imported,
                skipped: result.skippedDuplicates,
              })}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('imports.result-account', { name: account.name })}
        </p>
      </div>
      {undo.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {undo.error instanceof Error
            ? undo.error.message
            : t('imports.error')}
        </p>
      ) : null}
      <ImportStepActions>
        {result.batchId !== null && !undo.isSuccess ? (
          <Button
            type="button"
            variant="outline"
            disabled={undo.isPending}
            onClick={() => undo.mutate(result.batchId as string)}
          >
            {undo.isPending ? t('imports.undoing') : t('imports.undo-import')}
          </Button>
        ) : null}
        <Button type="button" onClick={onDone}>
          {t('imports.done')}
        </Button>
      </ImportStepActions>
    </div>
  )
}
