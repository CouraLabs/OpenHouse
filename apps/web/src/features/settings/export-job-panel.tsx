import { Button } from '@workspace/ui/components/button'
import { Download, FileArchive } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { CreateDataExportBody } from '@workspace/poco'

import { useTenantSettings } from '@/lib/settings.js'
import { useDataExport } from './use-data-export.js'
import { formattingLocale } from '@/lib/i18n.js'

/** The props `ExportJobPanel` takes. */
interface ExportJobPanelProps {
  /** What to export: the tenant, or one member. */
  body: CreateDataExportBody
  /** The label the start button carries. */
  startLabel: string
}

/**
 * Runs a full export and shows where it stands: a start button, then the
 * pending state, then a Download button with the day the file expires. The
 * file is delivered in the app only and deleted after the first download or
 * 24 hours.
 */
export function ExportJobPanel({ body, startLabel }: ExportJobPanelProps) {
  const { t } = useTranslation()
  const { timezone } = useTenantSettings()
  const run = useDataExport()
  const failed = run.start.isError || run.job?.status === 'failed'

  if (run.job?.status === 'ready') {
    const expires = new Intl.DateTimeFormat(formattingLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(run.job.expiresAt))

    return (
      <div className="flex flex-col gap-2">
        <Button
          disabled={run.download.isPending}
          onClick={() => run.download.mutate()}
        >
          <Download />
          {run.download.isPending
            ? t('export.downloading')
            : t('export.download')}
        </Button>
        <p className="text-xs text-muted-foreground">
          {t('export.ready-note', { date: expires })}
        </p>
        {run.download.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {t('export.error')}
          </p>
        ) : null}
      </div>
    )
  }

  const busy = run.start.isPending || run.job?.status === 'pending'

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
      {failed || run.expired ? (
        <p role="alert" className="text-sm text-destructive">
          {run.expired ? t('export.expired') : t('export.error')}
        </p>
      ) : null}
    </div>
  )
}
