import { useTranslation } from 'react-i18next'
import { Button } from '@workspace/ui/components/button'

import { useImportUndo, useRecentImports } from './use-statement-imports.js'
import { formattingLocale } from '@/lib/i18n.js'

/**
 * The account's imports from the last 24 hours that still hold rows, each
 * with its Undo button — the way back for an import the user left the dialog
 * on. Renders nothing while there is none.
 */
export function RecentImports({ accountId }: { accountId: number }) {
  const { t } = useTranslation()
  const recent = useRecentImports(accountId)
  const undo = useImportUndo()
  const batches = recent.data ?? []

  if (batches.length === 0) {
    return null
  }

  const format = new Intl.DateTimeFormat(formattingLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{t('imports.recent-title')}</h3>
      <p className="text-sm text-muted-foreground">
        {t('imports.recent-hint')}
      </p>
      <ul className="flex flex-col divide-y rounded-lg border">
        {batches.map((batch) => (
          <li
            key={batch.batchId}
            className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
          >
            <span>
              {t('imports.recent-row', {
                count: batch.count,
                when: format.format(new Date(batch.importedAt)),
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={undo.isPending}
              onClick={() => undo.mutate(batch.batchId)}
            >
              {undo.isPending && undo.variables === batch.batchId
                ? t('imports.undoing')
                : t('imports.undo')}
            </Button>
          </li>
        ))}
      </ul>
      {undo.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {undo.error instanceof Error
            ? undo.error.message
            : t('imports.error')}
        </p>
      ) : null}
    </section>
  )
}
