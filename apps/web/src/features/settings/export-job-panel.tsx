import { Button } from '@workspace/ui/components/button'
import { FileArchive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CreateDataExportBody } from '@workspace/poco'

import { useDataExport } from './use-data-export.js'

/** The props `ExportJobPanel` takes. */
interface ExportJobPanelProps {
  /** What to export: the tenant, or one member. */
  body: CreateDataExportBody
  /** The label the start button carries. */
  startLabel: string
}

/**
 * Runs a full export and hands the file to the browser's save flow: one
 * request builds the ZIP in memory and answers the bytes — the button
 * shows the pending state while it builds. Nothing is stored server-side.
 */
export function ExportJobPanel({ body, startLabel }: ExportJobPanelProps) {
  const { t } = useTranslation()
  const run = useDataExport()
  const busy = run.start.isPending

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => run.start.mutate(body)}
      >
        <FileArchive />
        {busy ? t('export.preparing') : startLabel}
      </Button>
      {run.start.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('export.error')}
        </p>
      ) : null}
    </div>
  )
}
