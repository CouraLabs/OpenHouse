import { Button } from '@workspace/ui/components/button'
import { FileArchive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CreateDataExportBody } from '@workspace/poco'

import { useDataExport } from './use-data-export.js'

interface ExportJobPanelProps {
  body: CreateDataExportBody
  startLabel: string
}

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
